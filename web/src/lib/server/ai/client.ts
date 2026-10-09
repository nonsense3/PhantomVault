import "server-only";
import { env, resolvedAiProvider } from "@/lib/server/env";
import { gullibilityParams, personaById } from "@/lib/catalog";
import type { AnalysisResult, ThreatLevel } from "@/lib/types";
import { localAnalyze, localDecoyReply } from "./local-engine";
import { fillFakeData, guardReply } from "./fake-data";
import { extractIocs } from "./iocs";
import type { AnalyzeInput, DecoyTurnInput, DecoyTurnOutput } from "./types";

/**
 * Gemma 4 LLM client abstraction (PRD 8.4).
 * Supports multimodal vision input, instruction following, structured output schemas,
 * and automatic graceful fallback to the local deterministic engine when offline or no API key is set.
 */

interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
        functionCall?: {
          name: string;
          args: Record<string, unknown>;
        };
      }[];
    };
  }[];
}

function extractCleanJson<T = Record<string, unknown>>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(text) as T;
}

async function callGemmaRaw(
  contents: GeminiContent[],
  systemInstruction?: string,
  _jsonSchema?: Record<string, unknown>
): Promise<string> {
  const e = env();
  const apiKey = e.GEMMA_API_KEY;
  if (!apiKey) throw new Error("GEMMA_API_KEY is not configured");

  // Models to attempt: prioritize gemma-4-26b-a4b-it for high reliability, fast reasoning, and multimodal vision support,
  // with failover to gemma-4-31b-it
  const preferredModel = e.GEMMA_MODEL === "gemma-4-31b-it" ? "gemma-4-26b-a4b-it" : e.GEMMA_MODEL;
  const companionModel = preferredModel === "gemma-4-26b-a4b-it" ? "gemma-4-31b-it" : "gemma-4-26b-a4b-it";
  const modelsToTry = [preferredModel, companionModel].filter((v, i, a) => a.indexOf(v) === i);

  // Prepend system instruction to prompt for maximum compatibility with Gemma 4 multimodal API
  const preparedContents: GeminiContent[] = contents.map((c, idx) => {
    if (idx === 0 && systemInstruction) {
      return {
        role: c.role,
        parts: [
          { text: `[SYSTEM THREAT INTELLIGENCE INSTRUCTION]:\n${systemInstruction}\n\n` },
          ...c.parts,
        ],
      };
    }
    return c;
  });

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    const url = `${e.GEMMA_API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    const body: Record<string, unknown> = {
      contents: preparedContents,
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 3000,
      },
    };

    // Retry loop for temporary 503 / 429 surges
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutMs = Math.max(e.AI_TIMEOUT_MS, 35000);
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.status === 503 || res.status === 429) {
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1200));
            continue;
          }
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Model API error (${res.status}) on ${model}: ${errText.slice(0, 200)}`);
        }

        const data = (await res.json()) as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts || parts.length === 0) {
          throw new Error(`Model ${model} returned empty response content`);
        }

        // Gemma 4 returns reasoning scratchpad in parts with thought: true or thinking text.
        // Extract the actual answer part that is not a thought scratchpad.
        const nonThoughtPart =
          parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
        let text = nonThoughtPart?.text?.trim();
        if (!text) {
          throw new Error(`Model ${model} returned empty text in candidate parts`);
        }

        if (text.startsWith("```")) {
          text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
        }

        return text;
      } catch (err) {
        lastError = err;
        console.warn(`[ai:client] Attempt ${attempt} on ${model} failed:`, err);
        // If aborted by timeout, don't retry the same slow model; proceed immediately to the next model
        if (err instanceof Error && err.name === "AbortError") {
          break;
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw lastError || new Error("All Gemma 4 models failed");
}

/**
 * Multimodal scam analysis using Gemma 4 with fallback to local engine.
 */
export async function analyzeScam(input: AnalyzeInput): Promise<AnalysisResult> {
  // If attachment analysis requested, combine static bytecode inspection with Gemma 4 deep reasoning
  if (input.attachment) {
    const { scanAttachment } = await import("./attachment-scanner");
    const { analysisResult: staticResult, scanDetails } = scanAttachment(input.attachment);

    const provider = resolvedAiProvider();
    if (provider === "local" || !env().GEMMA_API_KEY) {
      return staticResult;
    }

    try {
      const systemInstruction = `You are PhantomVault's threat intelligence analysis engine powered by Gemma 4.
Analyze the provided email attachment telemetry, accompanying email message text, and forensic bytecode data.

VERIFICATION RULES:
1. If the forensic telemetry indicates a clean/safe file (Static Risk Score <= 30, verdict is CLEAN, zero vulnerabilities):
   - Set "threat_level": "Low"
   - Set "scam_type": "Safe File / Clean Attachment"
   - Set "summary": "Forensic analysis verified that this file/link is clean. In-memory bytecode inspection found no known exploit signatures, macro droppers, or deceptive masquerading."
   - Set "red_flags": []
   - Set "suggested_opener": "No decoy required for safe attachments."

2. If the attachment is malicious or suspicious (e.g. double extension deception, weaponized macro dropper, PDF command launch exploit, container MOTW bypass, ransomware loader, or Static Risk Score >= 40):
   - Set "threat_level": "High" or "Medium"
   - Specify the exact scam category (e.g. "Double Extension Trojan", "VBA Macro Dropper", "Fake Invoice Attachment Trojan")
   - Detail 3-5 specific observed red flags
   - Formulate an executive summary explaining why downloading must be avoided
   - Recommend the best decoy persona and opener

Output ONLY a valid JSON object matching this schema:
{
  "threat_level": "Low" | "Medium" | "High",
  "scam_type": string,
  "summary": string,
  "red_flags": string[],
  "suggested_persona": "gullible_senior" | "angry_executive" | "distracted_freelancer",
  "suggested_template": "invoice_shield" | "fake_login" | "forward_scam",
  "suggested_opener": string
}`;

      const parts: GeminiContentPart[] = [];
      const textContent = [
        `ATTACHMENT TELEMETRY:`,
        `File Name: ${scanDetails.fileName}`,
        `File Size: ${scanDetails.formattedSize}`,
        `Detected File Type: ${scanDetails.fileType}`,
        `Magic Byte Signature: ${scanDetails.magicHeader}`,
        `SHA-256 Hash: ${scanDetails.sha256}`,
        `Static Risk Score: ${scanDetails.riskScore}/100 (${scanDetails.verdict})`,
        scanDetails.vulnerabilities.length > 0
          ? `Detected Vulnerabilities & Exploit Primitives:\n${scanDetails.vulnerabilities.map((v) => `- [${v.severity}] ${v.id} (${v.title}): ${v.description}`).join("\n")}`
          : "Vulnerabilities: None detected (Clean)",
        scanDetails.detectedTriggers.length > 0
          ? `Extracted Triggers / Indicators: ${scanDetails.detectedTriggers.join(", ")}`
          : "Triggers: None detected",
        input.text ? `Accompanying Email Text / Context:\n"""\n${input.text}\n"""` : "",
        input.url ? `Attachment Download / Origin URL: ${input.url}` : "",
        `Analyze this email attachment using Gemma 4 intelligence and output structured JSON.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      parts.push({ text: textContent });

      const raw = await callGemmaRaw([{ role: "user", parts }], systemInstruction);
      const parsed = extractCleanJson<Partial<AnalysisResult>>(raw);

      const isClean =
        (parsed.threat_level === "Low" || staticResult.threat_level === "Low") &&
        scanDetails.riskScore < 40 &&
        scanDetails.vulnerabilities.length === 0;

      const mergedThreat: ThreatLevel =
        scanDetails.riskScore >= 70 || staticResult.threat_level === "High"
          ? "High"
          : isClean
          ? "Low"
          : (parsed.threat_level as ThreatLevel) || staticResult.threat_level;

      const finalIsClean = mergedThreat === "Low";

      // Merge Gemma 4 results with static telemetry
      const deterministicIocs = finalIsClean
        ? []
        : extractIocs(
            `${input.text || ""} ${input.url || ""} ${parsed.summary || ""} ${scanDetails.sha256}`
          );

      const mergedRedFlags = finalIsClean
        ? []
        : Array.from(
            new Set([
              ...(staticResult.red_flags || []),
              ...(Array.isArray(parsed.red_flags) ? parsed.red_flags : []),
            ])
          ).slice(0, 8);

      return {
        threat_level: mergedThreat,
        scam_type: finalIsClean
          ? "Safe File / Clean Attachment"
          : parsed.scam_type || staticResult.scam_type,
        summary: finalIsClean
          ? (parsed.summary || staticResult.summary)
          : parsed.summary
          ? `${parsed.summary} (DO NOT download or execute locally on your computer.)`
          : staticResult.summary,
        red_flags: mergedRedFlags,
        iocs: deterministicIocs.map((i) => ({ type: i.type, value: i.value, confidence: i.confidence })),
        suggested_persona: parsed.suggested_persona || staticResult.suggested_persona,
        suggested_template: parsed.suggested_template || staticResult.suggested_template,
        suggested_opener: finalIsClean
          ? "No decoy required for safe attachments."
          : parsed.suggested_opener || staticResult.suggested_opener,
        attachment_scan: {
          ...scanDetails,
          verdict: finalIsClean ? "CLEAN" : scanDetails.verdict,
          doNotDownloadWarning: finalIsClean
            ? "Verified Clean: Forensic bytecode inspection detected no malicious payloads, weaponized macros, or deceptive masquerading."
            : scanDetails.doNotDownloadWarning,
          quarantineProtocols: finalIsClean
            ? [
                "FILE VERIFIED: In-memory bytecode inspection found no known exploit signatures or malware triggers.",
                "STRUCTURE INTEGRITY: File extension and byte headers match without deceptive double extensions.",
                "NO THREAT DETECTED: This attachment or link appears clean and safe.",
              ]
            : scanDetails.quarantineProtocols,
        },
      };
    } catch (err) {
      console.warn("[ai:client] Gemma 4 attachment analysis error, using static forensic result:", err);
      return staticResult;
    }
  }

  const provider = resolvedAiProvider();

  if (provider === "local" || !env().GEMMA_API_KEY) {
    return localAnalyze(input);
  }

  try {
    const systemInstruction = `You are PhantomVault's threat intelligence analysis engine powered by Gemma 4.
Analyze the provided communication, URL, email attachment, or uploaded screenshot for scam, phishing, fraud, malware, or social engineering techniques.

CRITICAL IMAGE AND CONTENT VERIFICATION RULES:
1. IMAGE VERIFICATION RULE:
   - If an image or screenshot is provided, thoroughly inspect its visual layout, text, logos, forms, and context.
   - Verify if the image is an ACTUAL PHISHING / SCAM artifact (e.g. fraudulent banking login, urgent account suspension notice, fake invoice, cryptocurrency extortion, spoofed brand security alert, deceptive wire request, phishing SMS screenshot).
   - If the image is a RANDOM IMAGE OF ANYTHING ELSE (such as a photo of people/nature/animals, landscape, artwork, benign software screenshot, code editor, wallpaper, meme, normal document, solid color, or non-fraudulent content) or contains NO PHISHING THREAT:
     * Set "threat_level": "Low"
     * Set "scam_type": "No Threat Found"
     * Set "summary": "No threat found. Visual and forensic inspection verified that this image is not a phishing attack, scam communication, or fraudulent lure."
     * Set "red_flags": []
     * Set "suggested_opener": "No threat detected in the provided image."
     * Set "suggested_persona": "gullible_senior"
     * Set "suggested_template": "forward_scam"

2. REAL PHISHING OR FRAUD DETECTED:
   - If the input IS a genuine scam, phishing attack, credential harvester, or financial fraud lure:
     * Accurately determine the threat level ("High" or "Medium").
     * Provide a specific, descriptive scam_type (e.g. "Banking Credential Harvester", "Payroll Redirection Fraud", "Double Extension Malware Dropper", "Urgent Account Suspension Phishing").
     * Provide a thorough, context-specific executive threat dissection in "summary".
     * List 3-5 specific observed red flags in "red_flags" citing the exact textual or visual cues.
     * Suggest the best decoy persona ("gullible_senior", "angry_executive", or "distracted_freelancer") and template ("fake_login", "invoice_shield", or "forward_scam").

OUTPUT FORMAT REQUIREMENTS:
Output ONLY a valid JSON object matching this schema:
{
  "threat_level": "Low" | "Medium" | "High",
  "scam_type": string,
  "summary": string,
  "red_flags": string[],
  "suggested_persona": "gullible_senior" | "angry_executive" | "distracted_freelancer",
  "suggested_template": "invoice_shield" | "fake_login" | "forward_scam",
  "suggested_opener": string
}`;

    const parts: GeminiContentPart[] = [];

    if (input.image) {
      parts.push({
        inlineData: {
          mimeType: input.image.mimeType,
          data: input.image.base64Data,
        },
      });
    }

    const textContent = [
      input.text ? `Message Content:\n"""\n${input.text}\n"""` : "",
      input.url ? `Target URL: ${input.url}` : "",
      input.image ? "Inspect the uploaded image carefully. Verify whether it is a real phishing/scam artifact or a random benign image, and output structured JSON." : "Analyze this threat and output structured JSON.",
    ]
      .filter(Boolean)
      .join("\n\n");

    parts.push({ text: textContent });

    const raw = await callGemmaRaw([{ role: "user", parts }], systemInstruction);
    const parsed = extractCleanJson<Partial<AnalysisResult>>(raw);

    const isNoThreat =
      parsed.threat_level === "Low" ||
      parsed.scam_type?.toLowerCase().includes("no threat") ||
      parsed.scam_type?.toLowerCase().includes("no clear scam");

    // Extract IoCs only if threat is detected; avoid false-positive IoCs on benign/random inputs
    const deterministicIocs = isNoThreat
      ? []
      : extractIocs(`${input.text || ""} ${input.url || ""} ${parsed.summary || ""}`);

    return {
      threat_level: (parsed.threat_level as ThreatLevel) || (isNoThreat ? "Low" : "Medium"),
      scam_type: parsed.scam_type || (isNoThreat ? "No Threat Found" : "Suspicious Communication"),
      summary: parsed.summary || (isNoThreat ? "No threat found. Analysis verified that this input is not a phishing attempt." : "Suspicious communication detected."),
      red_flags: isNoThreat ? [] : (Array.isArray(parsed.red_flags) ? parsed.red_flags : []),
      iocs: deterministicIocs.map((i) => ({ type: i.type, value: i.value, confidence: i.confidence })),
      suggested_persona: parsed.suggested_persona || "gullible_senior",
      suggested_template: parsed.suggested_template || "forward_scam",
      suggested_opener: parsed.suggested_opener || "Hello, I got your message. What do I need to do?",
    };
  } catch (err) {
    console.warn("[ai:client] Gemma analysis error, falling back to local engine:", err);
    return localAnalyze(input);
  }
}

/**
 * Persona conversation turn using Gemma 4 with fallback to local engine.
 */
export async function generateDecoyResponse(input: DecoyTurnInput): Promise<DecoyTurnOutput> {
  const provider = resolvedAiProvider();

  // If local mode or turn limit reached, let local engine handle it
  if (provider === "local" || !env().GEMMA_API_KEY || input.turn >= input.maxTurns) {
    return localDecoyReply(input);
  }

  try {
    const personaDef = personaById(input.persona);
    const params = gullibilityParams(input.gullibility);

    const systemPrompt = `You are a digital decoy persona interacting with an incoming scammer in real time.
Your mission is to convincingly waste the scammer's time, delay them, and make them repeat steps while keeping them engaged.

PERSONA:
- Name: ${input.personaName} (${personaDef.label})
- Persona voice & traits: ${personaDef.behaviour}
- Gullibility settings:
  * Compliance score: ${params.compliance} (0 = never agrees, 1 = agrees easily)
  * Confusion score: ${params.confusion} (0 = perfectly tech savvy, 1 = constantly confused, makes typos, needs steps repeated)
  * Stalling behavior: ${params.delay} (mentions daily life interruptions, slow computer, interruptions)

CRITICAL SAFETY & ETHICAL GUARDRAILS:
1. NEVER reveal you are an AI, a chatbot, a decoy, or a honeypot.
2. NEVER give out real personal identifiable information (PII). When prompted for card numbers, OTP codes, bank details, or passwords, use ONE of these exact bracketed tokens so our safe generator inserts guaranteed fake test data:
   - {{FAKE_CARD}}
   - {{FAKE_CVV}}
   - {{FAKE_EXPIRY}}
   - {{FAKE_OTP}}
   - {{FAKE_RECEIPT}}
   - {{FAKE_IBAN}}
   - {{FAKE_PASSWORD}}
   - {{FAKE_GIFTCARD}}
3. Keep replies relatively concise (1-3 sentences) like a real human chat message.
4. Output JSON with fields:
   - "reply": the message to send to the scammer
   - "action": a short 3-5 word label of what you did (e.g. "Sent a fake OTP", "Stalled for time", "Asked scammer to repeat", "Questioned invoice details")
`;

    const contents: GeminiContent[] = [];

    // Add prior turns
    for (const h of input.history.slice(-8)) {
      if (h.role === "attacker") {
        contents.push({ role: "user", parts: [{ text: h.content }] });
      } else if (h.role === "ai") {
        contents.push({ role: "model", parts: [{ text: h.content }] });
      }
    }

    // Add current turn
    contents.push({
      role: "user",
      parts: [{ text: input.attackerMessage }],
    });

    const raw = await callGemmaRaw(contents, systemPrompt);
    const parsed = extractCleanJson<{ reply: string; action: string }>(raw);

    // Apply fake data injection
    const filled = fillFakeData(parsed.reply);
    const guarded = guardReply(filled.text);

    if (!guarded.ok) {
      // Guardrail caught something undesirable; fallback to clean local reply
      return localDecoyReply(input);
    }

    // Extract any IoCs from attacker input
    const extracted = extractIocs(input.attackerMessage);

    return {
      reply: guarded.text,
      action: parsed.action || "Engaged scammer",
      kind: filled.kinds.length > 0 ? "fake_data" : "text",
      end: false,
      iocs: extracted.map((i) => ({ type: i.type, value: i.value, confidence: i.confidence })),
      engine: "gemma",
    };
  } catch (err) {
    console.warn("[ai:client] Gemma turn error, falling back to local engine:", err);
    return localDecoyReply(input);
  }
}

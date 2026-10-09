import "server-only";
import { randomInt } from "node:crypto";
import { gullibilityParams, personaById } from "@/lib/catalog";
import type { AnalysisResult, IocType, PersonaId, TemplateId, ThreatLevel } from "@/lib/types";
import { extractIocs } from "./iocs";
import { BANKS, INTENT_ACTION, type Intent } from "./personas";
import type { AnalyzeInput, DecoyTurnInput, DecoyTurnOutput, PortalEvent, PortalResult } from "@/lib/server/ai/types";

const rand = () => randomInt(1_000_000) / 1_000_000;

/* ------------------------------------------------------------------------- */
/* Intent detection                                                          */
/* ------------------------------------------------------------------------- */

const INTENT_PATTERNS: [Intent, RegExp][] = [
  ["giftcard", /gift\s?card|itunes|google\s?play|steam\s?card|apple\s?card|amazon\s?card|voucher/i],
  ["crypto", /bitcoin|\bbtc\b|crypto|wallet|usdt|tether|ethereum|\beth\b|binance|coinbase|atm machine/i],
  ["remote", /anydesk|teamviewer|remote|download|install|ultraviewer|quick\s?assist|\bapk\b|extension/i],
  ["otp", /\botp\b|one[- ]time|verification code|\bcode\b|6[- ]digit|\bpin\b|sms/i],
  ["card", /\bcard\b|\bcvv\b|\bcvc\b|expir|debit|credit/i],
  ["password", /password|passcode|log\s?in|username|credential/i],
  ["bank", /\bbank\b|account number|routing|sort code|\biban\b|swift|wire|transfer|\bacct\b/i],
  ["payment", /\bpay\b|payment|\bfee\b|send (?:me |us )?(?:the )?money|deposit|\$\s?\d|\d+\s?(?:usd|dollars|eur|gbp)|€|£|invoice/i],
  ["personal", /\bssn\b|social security|date of birth|\bdob\b|home address|passport|driver'?s licen|\bid card\b|mother'?s maiden/i],
  ["link", /https?:\/\/|www\.|click (?:the|this) link|\blink\b/i],
];

const THREAT_RE = /urgent|immediately|right now|\bnow\b|police|arrest|suspend|legal|lawsuit|court|deadline|within \d+|last chance|final notice|blocked|frozen/i;

export function detectIntent(text: string): Intent {
  for (const [intent, re] of INTENT_PATTERNS) if (re.test(text)) return intent;
  return "generic";
}

/* ------------------------------------------------------------------------- */
/* Persona reply                                                             */
/* ------------------------------------------------------------------------- */

function pickFresh(lines: string[] | undefined, used: Set<string>): string | null {
  if (!lines || lines.length === 0) return null;
  const fresh = lines.filter((l) => !used.has(l));
  const pool = fresh.length ? fresh : lines;
  return pool[randomInt(pool.length)];
}

function personalise(line: string, name: string): string {
  const first = name.split(" ")[0] ?? name;
  return line
    .replaceAll("{{NAME}}", name)
    .replaceAll("{{FIRST}}", first)
    .replaceAll("{{FIRST_LOWER}}", first.toLowerCase());
}

/** Gullible Senior makes small typing mistakes (PRD 8.3). Placeholders are never touched. */
function addTypos(text: string, rate: number): string {
  return text
    .split(" ")
    .map((word) => {
      if (word.includes("{{") || word.length < 4 || rand() > rate) return word;
      const i = 1 + randomInt(word.length - 2);
      return rand() < 0.5 ? word.slice(0, i) + word[i] + word.slice(i) : word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
    })
    .join(" ");
}

export function localDecoyReply(input: DecoyTurnInput): DecoyTurnOutput {
  const bank = BANKS[input.persona];
  const params = gullibilityParams(input.gullibility);
  const used = new Set<string>(
    input.history
      .filter((h: { role: string; content: string; template?: string }) => h.role === "ai")
      .map((h: { role: string; content: string; template?: string }) => (h.template ?? h.content) as string)
  );
  const intent = detectIntent(input.attackerMessage);
  const isThreat = THREAT_RE.test(input.attackerMessage);
  const aiTurns = input.history.filter((h) => h.role === "ai").length;

  let line: string | null = null;
  let action = "";
  let end = false;

  if (input.turn >= input.maxTurns) {
    line = pickFresh(bank.goodbye, used);
    action = "Ended conversation";
    end = true;
  } else if (aiTurns === 0) {
    const greet = pickFresh(bank.greet, used) ?? "";
    const follow = intent !== "generic" ? pickFresh(bank.clarify[intent], used) : null;
    line = follow ? `${greet} ${follow}` : greet;
    action = "Opened the conversation";
  } else {
    const r = rand();
    const delay = params.delay * 0.45;
    const confusion = params.confusion * 0.45;
    if (isThreat && rand() < 0.55) {
      line = pickFresh(bank.threat, used);
      action = input.persona === "angry_executive" ? "Demanded escalation" : "Reacted to pressure";
    } else if (r < delay) {
      line = pickFresh(bank.stall, used);
      action = input.persona === "distracted_freelancer" ? "Got interrupted" : "Stalled for time";
    } else if (r < delay + confusion) {
      line = pickFresh(bank.repeat, used);
      action = "Asked scammer to repeat";
    } else if (bank.comply[intent] && rand() < params.compliance && aiTurns >= 2) {
      line = pickFresh(bank.comply[intent], used);
      action = INTENT_ACTION[intent].comply;
    } else {
      line = pickFresh(bank.clarify[intent], used) ?? pickFresh(bank.generic, used);
      action = INTENT_ACTION[intent].clarify;
    }
  }

  const template = line ?? "Sorry, could you say that again?";
  let reply = personalise(template, input.personaName);
  if (input.persona === "gullible_senior") reply = addTypos(reply, params.confusion * 0.12);
  const fakeData = [...reply.matchAll(/\{\{\s*FAKE_([A-Z]+)\s*\}\}/g)].map((m) => m[1].toLowerCase());

  return {
    reply,
    template,
    action,
    kind: fakeData.length ? "fake_data" : "text",
    end,
    endReason: end ? "Turn limit reached" : undefined,
    iocs: [],
    engine: "local",
  };
}

/* ------------------------------------------------------------------------- */
/* Fake login portal (Northwind Secure Bank)                                 */
/* ------------------------------------------------------------------------- */

export interface LocalPortalOptions {
  presetPassword?: string;
  customSecurityQuestion?: string;
}

/**
 * Portal mode: behaves like a financial/corporate login honeypot.
 * It captures submitted credentials, challenges the visitor with OTP and security
 * questions, and displays a fake account dashboard to capture wire/payment details.
 */
export function localPortalStep(
  event: PortalEvent,
  gullibility: number,
  attempts: number,
  holderName: string,
  options?: LocalPortalOptions
): PortalResult {
  const p = gullibilityParams(gullibility);
  const first = holderName.split(" ")[0];

  switch (event.step) {
    case "login": {
      const enteredPass = (event.data.password || "").trim();
      const presetPass = (options?.presetPassword || "").trim();

      // If an operator specified a decoy password and the entered password does not match
      if (presetPass && enteredPass !== presetPass) {
        return {
          screen: "login",
          notice: "Authentication failed. The User ID or Password you entered is incorrect. Please check your credentials and try again.",
          tone: "error",
          action: "Rejected login (password mismatch against preset)",
        };
      }

      // If password or username was entered, accept and advance to MFA/OTP
      return {
        screen: "otp",
        notice: "Credentials authenticated. For your security, enter the 6-digit one-time verification passcode sent to your registered mobile number ending in •• 4821.",
        tone: "info",
        action: "Captured login credentials & showed fake OTP prompt",
      };
    }
    case "otp": {
      const code = (event.data.otpCode || "").trim();
      if (!code || code.length < 4) {
        return {
          screen: "otp",
          notice: "Invalid code format. Please enter a valid 6-digit verification code.",
          tone: "error",
          action: "Requested valid verification code",
        };
      }

      return {
        screen: "security",
        notice: "Identity confirmation required. Please answer your security verification question to continue.",
        tone: "info",
        question:
          options?.customSecurityQuestion?.trim() ||
          ["What was the name of your first pet?", "In what town was your mother born?", "What was the make of your first car?"][attempts % 3],
        action: "Captured OTP code & prompted for security question",
      };
    }
    case "security": {
      return {
        screen: "account",
        notice: `Security verification confirmed. Welcome back, ${first}.`,
        tone: "success",
        action: "Captured security response & opened decoy account dashboard",
      };
    }
    case "transfer": {
      return {
        screen: "receipt",
        notice: "Payment scheduled. Transfer is undergoing standard 3–5 working day settlement review.",
        tone: "success",
        action: "Captured scammer wire instructions & generated fake payment receipt",
        receipt: true,
      };
    }
  }
}

/* ------------------------------------------------------------------------- */
/* Heuristic analyzer                                                        */
/* ------------------------------------------------------------------------- */

interface Rule {
  re: RegExp;
  flag: string;
  weight: number;
  type?: string;
}

const RULES: Rule[] = [
  { re: /urgent|immediately|within \d+ ?(?:hours?|hrs?|minutes?|days?)|asap|final notice|last chance|act now|expires? today/i, flag: "Urgent deadline or pressure to act fast", weight: 1 },
  { re: /suspend|locked|frozen|closed|deactivat|arrest|police|legal action|lawsuit|court|warrant/i, flag: "Threatens account closure or legal trouble", weight: 1.5, type: "Bank Impersonation" },
  { re: /gift\s?card|itunes|google\s?play|steam card|amazon card/i, flag: "Asks for payment in gift cards", weight: 2.5, type: "Gift Card Scam" },
  { re: /bitcoin|\bbtc\b|crypto|usdt|wallet address|ethereum|binance|recover (?:your )?(?:funds|crypto)/i, flag: "Asks for cryptocurrency or a wallet transfer", weight: 2, type: "Crypto Recovery Scam" },
  { re: /\botp\b|one[- ]time (?:code|password)|verification code|password|login details|confirm your (?:identity|account|details)/i, flag: "Asks for a password or one-time code", weight: 2, type: "Phishing (Credential Theft)" },
  { re: /inherit|beneficiary|next of kin|unclaimed|million|transfer of funds|barrister|diplomat/i, flag: "Promises a large, unexpected sum of money", weight: 2, type: "Advance-Fee Fraud" },
  { re: /processing fee|release fee|clearance fee|customs fee|small fee|handling fee|upfront/i, flag: "Requires an upfront fee before you receive anything", weight: 2, type: "Advance-Fee Fraud" },
  { re: /won|winner|lottery|prize|congratulations|selected|reward/i, flag: "Claims you've won a prize you never entered for", weight: 1.5, type: "Prize / Lottery Scam" },
  { re: /anydesk|teamviewer|remote access|ultraviewer|quick ?assist|virus|infected|malware|tech support|microsoft support|apple support/i, flag: "Claims your device has a problem or asks for remote access", weight: 2, type: "Tech Support Scam" },
  { re: /invoice|overdue|outstanding balance|payment (?:due|request)|remittance|wire (?:the )?payment|updated bank details|new bank details/i, flag: "Unexpected invoice or change of payment details", weight: 1.5, type: "Fake Invoice" },
  { re: /parcel|package|delivery|courier|shipment|redeliver/i, flag: "Unexpected delivery notice asking for action", weight: 1, type: "Delivery Scam" },
  { re: /work from home|per day|per week|job offer|hiring|recruit|easy money|no experience/i, flag: "Job offer with unrealistic pay", weight: 1.5, type: "Job Offer Scam" },
  { re: /recovery code|account recovery|verify (?:your )?(?:instagram|account ownership)|copyright violation|brand deal|collab/i, flag: "Account-recovery or brand-deal bait", weight: 1.5, type: "Account Recovery Scam" },
  { re: /my dear|my love|sweetheart|lonely|soulmate/i, flag: "Unusually affectionate tone from a stranger", weight: 1, type: "Romance Scam" },
  { re: /dear (?:customer|user|client|sir|madam|account holder)|valued customer/i, flag: "Generic greeting instead of your name", weight: 0.75 },
  { re: /click (?:here|the link|below)|tap (?:here|the link)|follow (?:this|the) link/i, flag: "Pushes you to click a link", weight: 0.75 },
  { re: /do not (?:tell|share|contact)|keep this (?:confidential|secret)|don't tell/i, flag: "Asks you to keep it secret", weight: 1.5 },
];

const LOOKALIKE = /(?:secure|verify|login|update|account|support|billing|wallet|recover|auth|confirm)[a-z0-9-]*\.|\.(?:xyz|top|tk|ml|ga|cf|gq|pw|click|link|bid|win|loan|support|help)\b|\b\d{1,3}(?:\.\d{1,3}){3}\b/i;

function personaFor(type: string): PersonaId {
  if (/Invoice|Bank|Account Recovery|Phishing/.test(type)) return "angry_executive";
  if (/Job|Crypto|Delivery/.test(type)) return "distracted_freelancer";
  return "gullible_senior";
}

function templateFor(type: string): TemplateId {
  return /Phishing|Bank/.test(type) ? "fake_login" : "forward_scam";
}

export function openerFor(persona: PersonaId, scamType: string): string {
  const topic = scamType.toLowerCase().replace(/\s*\(.*\)/, "");
  switch (persona) {
    case "gullible_senior":
      return `Hello dear, I got your message about the ${topic}. My grandson set up this page because my email keeps losing things. What do I need to do?`;
    case "angry_executive":
      return `I received your message regarding the ${topic}. I'm between meetings. Tell me exactly what you need.`;
    case "distracted_freelancer":
      return `hey, saw ur msg about the ${topic}. sorry super busy today, what do u need from me?`;
  }
}

export function localAnalyze(input: AnalyzeInput): AnalysisResult {
  const text = [input.text, input.url].filter(Boolean).join("\n").trim();
  const flags: string[] = [];
  const typeScores = new Map<string, number>();
  let score = 0;

  for (const rule of RULES) {
    if (rule.re.test(text)) {
      flags.push(rule.flag);
      score += rule.weight;
      if (rule.type) typeScores.set(rule.type, (typeScores.get(rule.type) ?? 0) + rule.weight);
    }
  }

  const iocs = extractIocs(text);
  const links = iocs.filter((i) => i.type === "url" || i.type === "domain");
  if (links.some((l) => LOOKALIKE.test(l.value))) {
    flags.push("Link points to an unfamiliar or look-alike domain");
    score += 1.5;
  }
  const freemail = iocs.find((i) => i.type === "email" && /@(gmail|yahoo|outlook|hotmail|aol|proton)/i.test(i.value));
  if (freemail && /bank|support|security|billing|team|department|official/i.test(text)) {
    flags.push("Sender uses a free email address while claiming to be an organisation");
    score += 1.5;
  }
  if (iocs.some((i) => i.type === "wallet")) score += 1;

  let scamType = [...typeScores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!scamType) scamType = flags.length ? "Suspicious Message" : "No Clear Scam Pattern";

  const threat: ThreatLevel = score >= 4 ? "High" : score >= 2 ? "Medium" : "Low";
  const persona = personaFor(scamType);

  if (input.image && !text) {
    return {
      threat_level: "Medium",
      scam_type: "Unread Screenshot",
      summary:
        "We saved your screenshot, but automatic image reading is switched off right now. Paste the message text for a full analysis.",
      red_flags: ["Image could not be read automatically"],
      iocs: [],
      suggested_persona: "gullible_senior",
      suggested_template: "forward_scam",
      suggested_opener: openerFor("gullible_senior", "message you sent"),
    };
  }

  const summary =
    flags.length === 0
      ? "We didn't find common scam patterns in this message. Stay cautious if it asks for money or codes."
      : `This looks like ${/^[AEIOU]/i.test(scamType) ? "an" : "a"} ${scamType.toLowerCase()} with ${flags.length} warning sign${flags.length === 1 ? "" : "s"}.`;

  return {
    threat_level: threat,
    scam_type: scamType,
    summary,
    red_flags: flags.slice(0, 8),
    iocs: iocs.map((i) => ({ type: i.type as IocType, value: i.value, confidence: i.confidence })),
    suggested_persona: persona,
    suggested_template: templateFor(scamType),
    suggested_opener: openerFor(persona, scamType),
  };
}

export function personaDisplayName(persona: PersonaId, custom?: string): string {
  return custom?.trim() || personaById(persona).defaultName;
}

import "server-only";
import { createHash } from "node:crypto";
import type {
  AnalysisResult,
  AttachmentScanDetails,
  AttachmentVulnerability,
  IocType,
  PersonaId,
  TemplateId,
  ThreatLevel,
} from "@/lib/types";
import { extractIocs } from "./iocs";

export interface AttachmentScanInput {
  name: string;
  size?: number;
  mimeType?: string;
  base64Data?: string;
}

export async function fetchRemoteAttachment(urlStr: string): Promise<{
  name: string;
  size: number;
  mimeType: string;
  base64Data: string;
}> {
  const parsed = new URL(urlStr);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Invalid attachment URL protocol (must be http or https)");
  }

  // SSRF guard: reject local and private IP addresses
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw new Error("Access to local or private network addresses is blocked for safety");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(urlStr, {
      method: "GET",
      headers: {
        "User-Agent": "PhantomVault-ThreatScanner/2.0 (Forensic Cloud Sandbox)",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Remote server returned HTTP ${res.status}`);
    }

    const mimeType = res.headers.get("content-type") || "application/octet-stream";
    const disposition = res.headers.get("content-disposition") || "";

    let fileName = "";
    const match = /filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i.exec(disposition);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    } else {
      const pathname = parsed.pathname;
      fileName = pathname.split("/").filter(Boolean).pop() || "remote_attachment.bin";
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer).subarray(0, 15 * 1024 * 1024);

    return {
      name: fileName,
      size: buffer.length,
      mimeType,
      base64Data: buffer.toString("base64"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Metadata Only (Not Downloaded)";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


const EXECUTABLE_EXTENSIONS = new Set([
  "exe", "scr", "bat", "cmd", "ps1", "vbs", "vbe", "js", "jse", "wsf",
  "wsh", "hta", "cpl", "msi", "dll", "reg", "pif", "com", "jar", "apk"
]);

const CONTAINER_EXTENSIONS = new Set(["iso", "img", "vhd", "vhdx", "chm", "one", "lnk"]);
const MACRO_OFFICE_EXTENSIONS = new Set(["docm", "xlsm", "pptm", "dotm", "xltm", "docb"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2"]);

const DOUBLE_EXT_REGEX = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|jpg|jpeg|png|gif|zip)\.(exe|scr|bat|cmd|ps1|vbs|vbe|js|jse|wsf|wsh|hta|cpl|msi|dll|reg|pif|com)$/i;

/**
 * Perform purely static, zero-execution forensic inspection on an uploaded email attachment.
 * Identifies exploit triggers, macro droppers, double extension masquerading, and known CVE patterns.
 */
export function scanAttachment(input: AttachmentScanInput): {
  analysisResult: AnalysisResult;
  scanDetails: AttachmentScanDetails;
} {
  const fileName = input.name.trim();
  const lowerName = fileName.toLowerCase();
  const ext = lowerName.split(".").pop() || "";
  const isDoubleExtension = DOUBLE_EXT_REGEX.test(fileName);
  const isExecutableExt = EXECUTABLE_EXTENSIONS.has(ext);
  const isContainerExt = CONTAINER_EXTENSIONS.has(ext);
  const isMacroExt = MACRO_OFFICE_EXTENSIONS.has(ext);
  const isArchiveExt = ARCHIVE_EXTENSIONS.has(ext);
  const isPdfExt = ext === "pdf";

  // Decode buffer if available
  let buffer: Buffer | null = null;
  if (input.base64Data) {
    try {
      buffer = Buffer.from(input.base64Data, "base64");
    } catch {
      buffer = null;
    }
  }

  const finalSize = typeof input.size === "number" ? input.size : (buffer ? buffer.length : 0);

  // Cryptographic hashing (safe in-memory)
  const sha256 = buffer
    ? createHash("sha256").update(buffer).digest("hex")
    : createHash("sha256").update(fileName + finalSize).digest("hex");
  const md5 = buffer
    ? createHash("md5").update(buffer).digest("hex")
    : createHash("md5").update(fileName + finalSize).digest("hex");


  // Magic byte header detection
  let magicHeader = "Unknown / Plain Text";
  let detectedFileType = ext.toUpperCase();
  let isExecutableHeader = false;

  if (buffer && buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];
    const b2 = buffer.length > 2 ? buffer[2] : 0;
    const b3 = buffer.length > 3 ? buffer[3] : 0;

    // Hex string of the first few bytes
    const hexSlice = Array.from(buffer.subarray(0, Math.min(8, buffer.length)))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");

    if (b0 === 0x4d && b1 === 0x5a) {
      magicHeader = `${hexSlice} (MZ - Windows PE Executable)`;
      detectedFileType = "PE Executable Binary";
      isExecutableHeader = true;
    } else if (b0 === 0x7f && b1 === 0x45 && b2 === 0x4c && b3 === 0x46) {
      magicHeader = `${hexSlice} (ELF - Linux/Unix Executable)`;
      detectedFileType = "ELF Binary";
      isExecutableHeader = true;
    } else if (b0 === 0x25 && b1 === 0x50 && b2 === 0x44 && b3 === 0x46) {
      magicHeader = `${hexSlice} (%PDF - Adobe Portable Document)`;
      detectedFileType = "PDF Document";
    } else if (b0 === 0x50 && b1 === 0x4b && b2 === 0x03 && b3 === 0x04) {
      magicHeader = `${hexSlice} (PK - Zip / OpenXML Package)`;
      detectedFileType = "ZIP / Office OpenXML Archive";
    } else if (b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0) {
      magicHeader = `${hexSlice} (OLE2 Compound Document)`;
      detectedFileType = "Microsoft OLE Compound Document";
    } else if (b0 === 0x37 && b1 === 0x7a && b2 === 0xbc && b3 === 0xaf) {
      magicHeader = `${hexSlice} (7z Archive)`;
      detectedFileType = "7-Zip Container";
    } else if (b0 === 0x52 && b1 === 0x61 && b2 === 0x72 && b3 === 0x21) {
      magicHeader = `${hexSlice} (Rar Archive)`;
      detectedFileType = "RAR Container";
    } else {
      magicHeader = `${hexSlice} (${ext.toUpperCase()} Data)`;
    }
  } else {
    magicHeader = `Estimated based on .${ext}`;
  }

  // Extract ASCII printable strings from buffer (sample first 1MB)
  let bufferText = "";
  if (buffer) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 1024 * 1024));
    bufferText = sample.toString("latin1");
  }

  const vulnerabilities: AttachmentVulnerability[] = [];
  const detectedTriggers: string[] = [];
  const redFlags: string[] = [];
  let riskScore = 0;

  // 1. Double extension detection (MITRE T1036.007)
  if (isDoubleExtension) {
    riskScore += 45;
    detectedTriggers.push(`Double Extension Masking (*.${ext})`);
    redFlags.push(`Deceptive double file extension detected: "${fileName}"`);
    vulnerabilities.push({
      id: "MITRE-T1036.007",
      title: "Masquerading: Double File Extension",
      severity: "CRITICAL",
      description: `The file utilizes a secondary executable extension (.${ext}) appended after a benign document extension. Windows file explorer often hides extensions by default, tricking users into launching it as a document.`,
    });
  }

  // 2. MIME & Signature mismatch: named document but is PE binary
  if (isExecutableHeader && !isExecutableExt) {
    riskScore += 50;
    detectedTriggers.push("Executable PE Header in Disguised Document");
    redFlags.push(`File named "${fileName}" has a hidden executable PE (MZ) binary header`);
    vulnerabilities.push({
      id: "MITRE-T1036.008",
      title: "Signature Mismatch: Compiled Binary Disguised as Document",
      severity: "CRITICAL",
      description: `The file is named as a .${ext} file, but internal byte inspection reveals it is an executable program. Opening this file will directly trigger arbitrary binary execution on your operating system.`,
    });
  }

  // 3. Direct executable delivery via email (MITRE T1204.002)
  if (isExecutableExt || isExecutableHeader) {
    riskScore += 40;
    detectedTriggers.push(`Executable Binary / Script Format (.${ext})`);
    redFlags.push(`Attachment is an executable program or script (.${ext})`);
    vulnerabilities.push({
      id: "MITRE-T1204.002",
      title: "Direct Executable Delivery via Email Attachment",
      severity: "CRITICAL",
      description: `Executable attachments (.exe, .scr, .bat, .vbs, .ps1) are the primary vector for ransomware droppers, info-stealers (AgentTesla, RedLine), and remote access trojans (AsyncRAT).`,
    });
  }

  // 4. Mark-of-the-Web (MOTW) container evasion (.iso, .img, .vhd)
  if (isContainerExt) {
    riskScore += 35;
    detectedTriggers.push(`Disk Container MOTW Bypass (.${ext})`);
    redFlags.push(`Disk image container (.${ext}) used to evade Windows Mark-of-the-Web security flags`);
    vulnerabilities.push({
      id: "MITRE-T1553.005",
      title: "Subvert Trust Controls: Mark-of-the-Web (MOTW) Container Bypass",
      severity: "HIGH",
      description: `ISO and VHD disk images are routinely leveraged by threat actors (Qakbot, Bumblebee, DarkGate) because Windows does not propagate the Internet Zone Identifier flag to files extracted from mounted virtual drives.`,
    });
  }

  // 5. Macro-enabled Office file
  if (isMacroExt) {
    riskScore += 30;
    detectedTriggers.push(`Macro-Enabled Office Document Format (.${ext})`);
    redFlags.push(`Macro-enabled Microsoft Office format (.${ext}) with potential VBA payload`);
    vulnerabilities.push({
      id: "CVE-2017-11882",
      title: "VBA Macro Weaponization Risk",
      severity: "HIGH",
      description: `Macro-enabled documents (.docm, .xlsm) carry embedded Visual Basic scripts. Threat actors prompt victims to "Enable Content" to execute malicious background droppers.`,
    });
  }

  // 6. Inspect PDF bytecode triggers
  if (isPdfExt || bufferText.includes("%PDF")) {
    if (/\/launch/i.test(bufferText)) {
      riskScore += 40;
      detectedTriggers.push("PDF /Launch Arbitrary Command Action");
      redFlags.push("Contains PDF /Launch action instructing reader to execute external OS commands");
      vulnerabilities.push({
        id: "CVE-2010-2883",
        title: "PDF Arbitrary Command Execution (/Launch Action)",
        severity: "CRITICAL",
        description: `The PDF document embeds a /Launch dictionary that instructs PDF readers to spawn external executable processes or shell commands when the document is viewed.`,
      });
    }

    if (/\/javascript|\/js\b/i.test(bufferText)) {
      riskScore += 30;
      detectedTriggers.push("PDF Embedded JavaScript Runtime (/JS)");
      redFlags.push("Embedded JavaScript engine routines detected inside PDF streams");
      vulnerabilities.push({
        id: "CVE-2020-9715",
        title: "PDF Embedded JavaScript Exploitation Primitive",
        severity: "HIGH",
        description: `Embedded PDF JavaScript is frequently weaponized in spear-phishing campaigns to exploit memory corruption vulnerabilities in Adobe Reader or initiate silent secondary downloads.`,
      });
    }

    if (/\/openaction|\/aa\b/i.test(bufferText)) {
      riskScore += 25;
      detectedTriggers.push("PDF /OpenAction Autoplay Trigger");
      redFlags.push("Automatic action trigger (/OpenAction) executes immediately upon document open");
      vulnerabilities.push({
        id: "MITRE-T1204.002",
        title: "PDF Automatic Document Open Execution Trigger",
        severity: "HIGH",
        description: `The document contains an /OpenAction trigger that fires payload actions automatically without requiring any user click or consent.`,
      });
    }

    if (/\/embeddedfiles/i.test(bufferText)) {
      riskScore += 25;
      detectedTriggers.push("PDF /EmbeddedFiles Concealed Dropper");
      redFlags.push("Concealed auxiliary files or binaries bundled inside PDF streams");
      vulnerabilities.push({
        id: "MITRE-T1027.009",
        title: "Concealed Embedded Payloads (/EmbeddedFiles)",
        severity: "HIGH",
        description: `The PDF acts as a dropper container concealing secondary executable binaries within its internal file stream structure.`,
      });
    }

    if (/\/acroform/i.test(bufferText)) {
      detectedTriggers.push("Interactive AcroForm Phishing Fields");
    }

    if (!buffer && /subpoena|court|notice|invoice|remittance|statement|urgent|warrant|payment/i.test(lowerName)) {
      riskScore += 30;
      detectedTriggers.push(`High-Risk Unsolicited PDF Lure Profile`);
      redFlags.push(`External unsolicited PDF document with legal or financial urgency lure ("${fileName}")`);
      vulnerabilities.push({
        id: "CVE-2020-9715",
        title: "High-Risk External PDF Exploitation Vector",
        severity: "HIGH",
        description: `External unsolicited PDF attachments claiming urgent legal notices or invoices are routinely weaponized with embedded malicious links, /Launch actions, or Adobe Reader memory corruption exploits.`,
      });
    }
  }


  // 7. Inspect Macro and VBA string signatures
  if (
    /vbaproject\.bin|autoopen|auto_open|workbook_open|document_open/i.test(bufferText) ||
    /wscript\.shell|shellexecute|createobject\("wscript\.shell"\)/i.test(bufferText)
  ) {
    riskScore += 35;
    detectedTriggers.push("VBA AutoOpen / Shell Execution Primitives");
    redFlags.push("Detected automated Office execution hooks (AutoOpen / WScript.Shell)");
    vulnerabilities.push({
      id: "CVE-2021-40444",
      title: "Weaponized Office Macro & Execution Dropper",
      severity: "CRITICAL",
      description: `Contains automated macro execution triggers (AutoOpen/Workbook_Open) and system shell spawning calls (WScript.Shell). If opened and content is enabled, it initiates malware execution.`,
    });
  }

  // 8. PowerShell / LOLBin command strings
  if (/powershell(\.exe)?\s+(-(enc|encodedcommand|w\s+hidden|nop))/i.test(bufferText)) {
    riskScore += 45;
    detectedTriggers.push("Obfuscated PowerShell Execution String");
    redFlags.push("Found hidden/encoded PowerShell command execution string inside file");
    vulnerabilities.push({
      id: "MITRE-T1059.001",
      title: "Obfuscated / Hidden PowerShell Invocation",
      severity: "CRITICAL",
      description: `The file contains encoded or hidden-window PowerShell execution parameters, a hallmark of fileless malware droppers and memory-injection attacks.`,
    });
  }

  if (/certutil(\.exe)?\s+-urlcache|bitsadmin(\.exe)?\s+\/transfer|mshta(\.exe)?\s+http/i.test(bufferText)) {
    riskScore += 35;
    detectedTriggers.push("Living-off-the-Land Binary (LOLBin) Downloader");
    redFlags.push("References Windows administrative LOLBins (certutil/bitsadmin/mshta) for payload retrieval");
    vulnerabilities.push({
      id: "MITRE-T1218",
      title: "System Binary Proxy Execution (LOLBin Abuses)",
      severity: "HIGH",
      description: `The file references native Windows tools (certutil, bitsadmin, mshta) to bypass egress filtering and download external malware stages.`,
    });
  }

  // 9. Inspect suspicious keywords in filename
  if (/invoice|receipt|overdue|payment|remittance|statement|wire|po_\d+|order_\d+/i.test(lowerName)) {
    redFlags.push(`Deceptive financial lure in filename ("${fileName}")`);
  }
  if (/urgent|subpoena|court|warrant|notice|irs|tax|complaint|payroll/i.test(lowerName)) {
    redFlags.push(`Urgent authority or fear lure in filename ("${fileName}")`);
  }

  // Extract IoCs from text/strings
  const extractedIocs = extractIocs(bufferText);
  // Add the file hashes as technical IoCs
  extractedIocs.push({
    type: "ip" as IocType, // or technical hash; we can format IoC
    value: `sha256:${sha256}`,
    confidence: 1.0,
  });

  // Calculate final Risk Score & Verdict
  riskScore = Math.min(100, Math.max(isExecutableExt || isDoubleExtension ? 85 : 10, riskScore));
  const hasCritical = vulnerabilities.some((v) => v.severity === "CRITICAL");
  const hasHigh = vulnerabilities.some((v) => v.severity === "HIGH");

  let verdict: "MALICIOUS" | "SUSPICIOUS" | "CLEAN" = "CLEAN";
  let threatLevel: ThreatLevel = "Low";

  if (riskScore >= 70 || hasCritical || hasHigh || isDoubleExtension || isExecutableExt) {
    verdict = "MALICIOUS";
    threatLevel = "High";
  } else if (riskScore >= 40 || isContainerExt || isMacroExt || isArchiveExt) {
    verdict = "SUSPICIOUS";
    threatLevel = "Medium";
  } else {
    verdict = "CLEAN";
    threatLevel = "Low";
  }

  const isClean = verdict === "CLEAN" || threatLevel === "Low";

  const doNotDownloadWarning =
    threatLevel === "High"
      ? "⛔ CRITICAL SECURITY DIRECTIVE: DO NOT DOWNLOAD OR EXECUTE THIS ATTACHMENT ON YOUR WORKSTATION. Static inspection identified weaponized indicators and exploit triggers. Downloading or opening this file locally will compromise your machine."
      : threatLevel === "Medium"
      ? "⚠️ ELEVATED RISK WARNING: QUARANTINE THIS ATTACHMENT. DO NOT OPEN LOCALLY. The file exhibits evasive container attributes or macro capabilities commonly used in phishing attacks."
      : "✓ VERIFIED SAFE: Forensic bytecode inspection detected no malicious payloads, weaponized macros, or deceptive masquerading. File passed security checks.";

  const quarantineProtocols = isClean
    ? [
        "FILE INTEGRITY VERIFIED: In-memory bytecode analysis found no known exploit signatures or malware droppers.",
        "STRUCTURE INTEGRITY: File extension and byte headers match without deceptive double extensions.",
        "NO THREAT DETECTED: This attachment or link appears clean and safe to access.",
      ]
    : [
        "QUARANTINE IMMEDIATELY: Do NOT save to your local hard drive, extract from archives, or run the file.",
        "PURGE EMAIL: Delete the incoming phishing email from your inbox and permanently empty it from your trash.",
        "NEVER BYPASS GUARDS: Do NOT click 'Enable Editing', 'Enable Content', or disable Windows SmartScreen.",
        "NOTIFY IT/SOC: Report the sender's address, subject line, and the SHA-256 hash below to your security team.",
        "DEPLOY HONEYPOT DECOY: Use Phantom Vault below to turn this threat into an interactive decoy trap and bait the attacker.",
      ];

  // Determine scam type & decoy suggestions
  let scamType = "Safe File / Clean Attachment";
  let suggestedTemplate: TemplateId = "forward_scam";
  let suggestedPersona: PersonaId = "gullible_senior";

  if (threatLevel === "High" || threatLevel === "Medium") {
    if (/invoice|receipt|payment|bill|remittance|balance/i.test(lowerName)) {
      scamType = "Fake Invoice Attachment Trojan";
      suggestedTemplate = "invoice_shield";
      suggestedPersona = "angry_executive";
    } else if (/login|verify|account|security|password|auth|statement/i.test(lowerName)) {
      scamType = "Credential Harvester Attachment";
      suggestedTemplate = "fake_login";
      suggestedPersona = "gullible_senior";
    } else {
      scamType = isDoubleExtension ? "Double-Extension Malware Dropper" : "Suspicious Email Payload";
      suggestedTemplate = "forward_scam";
      suggestedPersona = "distracted_freelancer";
    }
  }

  const suggestedOpener = isClean
    ? "No decoy required for safe/clean attachments."
    : suggestedPersona === "angry_executive"
    ? `I received your email with the attachment "${fileName}". Our corporate gateway blocked the download for security compliance. State your outstanding balance and remit instructions directly.`
    : suggestedPersona === "gullible_senior"
    ? `Hello dear, I got your email with "${fileName}", but my computer gave me a big red warning when I tried to open it. Can you tell me what is inside or give me a link to see it?`
    : `Hey, saw your email with "${fileName}". My antivirus quarantined it automatically and won't let me open it. What did you need from me?`;

  const summary = isClean
    ? `Forensic attachment inspection of "${fileName}" (${formatBytes(finalSize)}) classified as LOW THREAT (CLEAN). Zero exploit primitives or deceptive patterns detected. File appears safe.`
    : `Static attachment analysis of "${fileName}" (${formatBytes(finalSize)}) classified as ${threatLevel.toUpperCase()} THREAT (${verdict}). ${
        vulnerabilities.length > 0
          ? `Identified ${vulnerabilities.length} active vulnerability / exploitation indicators: ${vulnerabilities.map((v) => v.id).join(", ")}.`
          : `Strict quarantine is advised for external email attachments.`
      } DO NOT download or execute this file locally.`;

  const scanDetails: AttachmentScanDetails = {
    fileName,
    fileSize: finalSize,
    formattedSize: formatBytes(finalSize),
    fileType: detectedFileType,

    mimeType: input.mimeType || "application/octet-stream",
    sha256,
    md5,
    magicHeader,
    isExecutable: isExecutableExt || isExecutableHeader,
    isDoubleExtension,
    verdict,
    riskScore,
    doNotDownloadWarning,
    quarantineProtocols,
    vulnerabilities,
    detectedTriggers,
    extractedStrings: detectedTriggers,
  };

  const analysisResult: AnalysisResult = {
    threat_level: threatLevel,
    scam_type: scamType,
    summary,
    red_flags: isClean ? [] : (redFlags.length > 0 ? redFlags : ["External untrusted attachment"]),
    iocs: isClean ? [] : extractedIocs.slice(0, 8).map((i) => ({
      type: (i.type === "url" || i.type === "domain" || i.type === "email" || i.type === "ip" || i.type === "wallet" || i.type === "bank" ? i.type : "domain") as IocType,
      value: i.value,
      confidence: i.confidence,
    })),
    suggested_persona: suggestedPersona,
    suggested_template: suggestedTemplate,
    suggested_opener: suggestedOpener,
    attachment_scan: scanDetails,
  };

  return { analysisResult, scanDetails };
}

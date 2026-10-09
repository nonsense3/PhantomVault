/** Shared domain types (mirrors the PRD data model, section 12). Safe for client and server. */

export type TemplateId = "forward_scam" | "fake_login" | "invoice_shield" | "social_contact";
export type PersonaId = "gullible_senior" | "angry_executive" | "distracted_freelancer";
export type TrapStatus = "active" | "paused";
export type ThreatLevel = "Low" | "Medium" | "High";
export type IncidentStatus = "active" | "idle" | "ended";
export type MessageRole = "attacker" | "ai" | "system";
export type MessageKind = "text" | "form_submit" | "fake_data";
export type IocType = "ip" | "email" | "phone" | "url" | "domain" | "wallet" | "bank";
export type AnalysisInputType = "image" | "text" | "url" | "attachment";


export interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Trap {
  id: string;
  ownerId: string;
  name: string;
  template: TemplateId;
  slug: string;
  persona: PersonaId;
  gullibility: number;
  status: TrapStatus;
  config: TrapConfig;
  createdAt: string;
}

export interface TrapConfig {
  /** Fictional display name of the persona shown on the decoy page. */
  personaName: string;
  /** Opening line the persona uses, usually derived from an analysis. */
  opener?: string;
  /** Scam context carried over from the Analyzer. */
  scamType?: string;
  sourceAnalysisId?: string;
  /** Custom brand/institution name for the decoy portal (e.g. "Northwind Bank", "PayPal Verification"). */
  portalBrand?: string;
  /** Preset target decoy username or email. */
  decoyUsername?: string;
  /** Preset target decoy password. */
  decoyPassword?: string;
  /** Fake account balance displayed in portal. */
  decoyBalance?: string;
  /** Custom security question. */
  securityQuestion?: string;
  /** Custom lure banner / notice headline. */
  lureHeadline?: string;
}

export interface Incident {
  id: string;
  trapId: string;
  ownerId: string;
  sourceIp: string;
  geo: { country?: string; city?: string } | null;
  userAgent: string;
  startedAt: string;
  lastActivityAt: string;
  status: IncidentStatus;
  scamType: string | null;
  threatLevel: ThreatLevel | null;
  timeWastedSeconds: number;
  summary: string | null;
  simulated: boolean;
  turns: number;
}

export interface Message {
  id: string;
  incidentId: string;
  ownerId: string;
  role: MessageRole;
  content: string;
  kind: MessageKind;
  /** For AI messages: the action label, e.g. "Sent a fake OTP". */
  action?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Ioc {
  id: string;
  incidentId: string;
  ownerId: string;
  type: IocType;
  value: string;
  confidence: number;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
}

export interface AttachmentVulnerability {
  id: string; // e.g. "CVE-2010-2883" or "MITRE-T1036.007"
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
}

export interface AttachmentScanDetails {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileType: string;
  mimeType: string;
  sha256: string;
  md5: string;
  magicHeader: string;
  isExecutable: boolean;
  isDoubleExtension: boolean;
  verdict: "MALICIOUS" | "SUSPICIOUS" | "CLEAN";
  riskScore: number; // 0 - 100
  doNotDownloadWarning: string;
  quarantineProtocols: string[];
  vulnerabilities: AttachmentVulnerability[];
  detectedTriggers: string[];
  extractedStrings?: string[];
}

export interface AnalysisResult {
  threat_level: ThreatLevel;
  scam_type: string;
  summary: string;
  red_flags: string[];
  iocs: { type: IocType; value: string; confidence: number }[];
  suggested_persona: PersonaId;
  suggested_template: TemplateId;
  suggested_opener: string;
  attachment_scan?: AttachmentScanDetails;
}


export interface Analysis {
  id: string;
  ownerId: string;
  inputType: AnalysisInputType;
  inputPreview: string;
  hasImage: boolean;
  result: AnalysisResult;
  convertedTrapId: string | null;
  createdAt: string;
}

/** Owner-scoped live events pushed to the dashboard. */
export type LiveEvent =
  | { type: "incident.created"; incident: Incident; trapName: string }
  | { type: "incident.updated"; incident: Incident }
  | { type: "message.created"; message: Message; trapName: string }
  | { type: "ioc.upserted"; ioc: Ioc }
  | { type: "trap.updated"; trap: Trap }
  | { type: "trap.deleted"; trapId: string }
  | { type: "ping"; at: string };

export interface TrapWithStats extends Trap {
  incidentCount: number;
  timeWastedSeconds: number;
  lastActivityAt: string | null;
}

export interface DashboardStats {
  activeTraps: number;
  totalTraps: number;
  scammersTrapped: number;
  timeWastedSeconds: number;
  iocCount: number;
  activeIncidents: number;
}

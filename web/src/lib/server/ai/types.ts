import "server-only";
import type { AnalysisResult } from "@/lib/types";
import type { IocType, PersonaId, TemplateId, ThreatLevel } from "@/lib/types";

export interface DecoyTurnInput {
  incidentId: string;
  trapId: string;
  trapName: string;
  template: TemplateId;
  persona: PersonaId;
  personaName: string;
  gullibility: number;
  attackerMessage: string;
  history: {
    role: "attacker" | "ai" | "system";
    content: string;
    action?: string;
    template?: string;
  }[];
  turn: number;
  maxTurns: number;
  context?: {
    scamType?: string;
    opener?: string;
  };
}

export interface DecoyTurnOutput {
  reply: string;
  action: string;
  template?: string;
  kind: "text" | "fake_data";
  end: boolean;
  endReason?: string;
  iocs: { type: IocType; value: string; confidence: number }[];
  engine: "gemma" | "local" | "service";
}

export interface AnalyzeInput {
  text?: string;
  url?: string;
  image?: {
    mimeType: string;
    base64Data: string;
  };
  attachment?: {
    name: string;
    size?: number;
    mimeType?: string;
    base64Data?: string;
    url?: string;
  };
}



export type PortalStep = "login" | "otp" | "security" | "transfer";

export interface PortalEvent {
  step: PortalStep;
  data: Record<string, string>;
}

export interface PortalResult {
  screen: "login" | "otp" | "security" | "account" | "receipt";
  notice: string;
  tone: "info" | "error" | "success";
  action: string;
  question?: string;
  receipt?: boolean;
}

import type { IocType, PersonaId, TemplateId, ThreatLevel } from "./types";

export interface PersonaDef {
  id: PersonaId;
  label: string;
  defaultName: string;
  tagline: string;
  behaviour: string;
}

export const PERSONAS: PersonaDef[] = [
  {
    id: "gullible_senior",
    label: "Gullible Senior",
    defaultName: "Margaret Hollis",
    tagline: "Polite, slow, trusts easily",
    behaviour: "Asks to repeat things, makes small typing mistakes and needs every step explained twice.",
  },
  {
    id: "angry_executive",
    label: "Angry Executive",
    defaultName: "Richard Vance",
    tagline: "Impatient, then complies",
    behaviour: "Demands escalation, threatens to call the bank, then grudgingly does what is asked, badly.",
  },
  {
    id: "distracted_freelancer",
    label: "Distracted Freelancer",
    defaultName: "Jamie Okafor",
    tagline: "Fragments, interruptions, forgets steps",
    behaviour: "Replies in pieces, gets pulled into calls and keeps asking where they were.",
  },
];

export interface TemplateDef {
  id: TemplateId;
  label: string;
  description: string;
  available: boolean;
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "forward_scam",
    label: "Forward-a-Scam Page",
    description:
      "A personal reply page. Send the link to whoever scammed you, and the persona keeps them talking.",
    available: true,
  },
  {
    id: "fake_login",
    label: "Fake Login Portal",
    description:
      "A fictional bank sign-in (Northwind Secure Bank). Intruders hit endless checks, fake codes and stalled transfers.",
    available: true,
  },
  {
    id: "invoice_shield",
    label: "Invoice Shield",
    description: "Open suspicious invoices and payment links in a safe viewer.",
    available: false,
  },
  {
    id: "social_contact",
    label: "Social Contact Link",
    description: "A decoy contact link for your profile that absorbs bots and fake brand deals.",
    available: false,
  },
];

export const personaById = (id: PersonaId) => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export function gullibilityLabel(value: number): string {
  if (value < 20) return "Super Helpful";
  if (value < 45) return "Cooperative";
  if (value < 65) return "Wobbly";
  if (value < 85) return "Very Confused";
  return "Max Confusion";
}

/** PRD 8.3: slider maps to compliance, confusion and delay behaviour. */
export function gullibilityParams(value: number) {
  const v = Math.max(0, Math.min(100, value)) / 100;
  return {
    compliance: Math.round((1 - v * 0.7) * 100) / 100,
    confusion: Math.round((0.1 + v * 0.8) * 100) / 100,
    delay: Math.round((0.15 + v * 0.6) * 100) / 100,
  };
}

export const IOC_LABELS: Record<IocType, string> = {
  ip: "IP address",
  email: "Email",
  phone: "Phone",
  url: "Link",
  domain: "Domain",
  wallet: "Crypto wallet",
  bank: "Bank details",
};

export const THREAT_META: Record<ThreatLevel, { label: string; className: string; glyph: string }> = {
  Low: { label: "Low", className: "threat-low", glyph: "▲" },
  Medium: { label: "Medium", className: "threat-medium", glyph: "▲▲" },
  High: { label: "High", className: "threat-high", glyph: "▲▲▲" },
};

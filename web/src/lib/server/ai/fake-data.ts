import "server-only";
import { randomInt } from "node:crypto";

/**
 * PRD AI-4: every "secret" the decoy hands over is non-functional by construction.
 * - Cards: publicly documented payment-test numbers that every processor rejects.
 * - IBANs: check digits "00" are never valid (valid range is 02-98).
 * - OTPs and codes: random, tied to no system.
 * - Receipts: reference IDs carry a TEST marker.
 * The model never writes these values itself. It emits placeholders like
 * {{FAKE_CARD}} and this module fills them in.
 */

export type FakeKind = "card" | "cvv" | "expiry" | "otp" | "receipt" | "iban" | "giftcard" | "password" | "account";

const TEST_CARDS = ["4000 0000 0000 0002", "4000 0000 0000 9995", "4000 0000 0000 0069", "4000 0000 0000 0127"];

const pick = <T,>(arr: readonly T[]): T => arr[randomInt(arr.length)];
const digits = (n: number) => Array.from({ length: n }, () => randomInt(10)).join("");

export function generateFakeData(kind: FakeKind): string {
  switch (kind) {
    case "card":
      return pick(TEST_CARDS);
    case "cvv":
      return pick(["000", "999", "100"]);
    case "expiry":
      return pick(["01/20", "13/29", "00/27"]);
    case "otp":
      return digits(6);
    case "receipt":
      return `NWB-TX-${digits(4)}-TEST-${digits(4)}`;
    case "iban":
      return `GB00 NWBK ${digits(4)} ${digits(4)} ${digits(4)} ${digits(2)}`;
    case "giftcard":
      return `GC00-${digits(4)}-VOID-${digits(4)}`;
    case "password":
      return pick(["Tulips1954", "Buster!Dog", "Pa55word_old", "summer-garden-7"]);
    case "account":
      return `00-00-00 / ${digits(4)}0000`;
  }
}

const TOKEN_RE = /\{\{\s*FAKE_(CARD|CVV|EXPIRY|OTP|RECEIPT|IBAN|GIFTCARD|PASSWORD|ACCOUNT)\s*\}\}/gi;

/** Replaces model placeholders with generated invalid values. */
export function fillFakeData(text: string): { text: string; kinds: FakeKind[]; values: Record<string, string> } {
  const kinds: FakeKind[] = [];
  const values: Record<string, string> = {};
  const out = text.replace(TOKEN_RE, (_m, k: string) => {
    const kind = k.toLowerCase() as FakeKind;
    const value = generateFakeData(kind);
    kinds.push(kind);
    values[kind] = value;
    return value;
  });
  return { text: out, kinds, values };
}

function luhnValid(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const AI_TELLS =
  /\b(as an ai|language model|i am an ai|i'm an ai|artificial intelligence|chatbot|i am a bot|i'm a bot|openai|system prompt|my instructions|i cannot assist|i can't assist|i'm sorry, but i can)\b/i;

/**
 * PRD AI-5 guardrails applied to every outgoing decoy reply:
 * - drops replies that reveal the decoy is automated (caller swaps in a fallback)
 * - swaps any card-like number that is not a known test number for a test number
 * - caps length so replies stay short and human
 */
export function guardReply(text: string): { ok: boolean; text: string } {
  if (AI_TELLS.test(text)) return { ok: false, text: "" };
  let out = text.replace(/\b(?:\d[ -]?){13,19}\b/g, (match) => {
    const d = match.replace(/\D/g, "");
    const isTest = TEST_CARDS.some((c) => c.replace(/\s/g, "") === d);
    return !isTest && luhnValid(d) ? pick(TEST_CARDS) : match;
  });
  out = out.replace(/\s{3,}/g, "  ").trim();
  if (out.length > 700) out = `${out.slice(0, 680).trimEnd()}…`;
  return { ok: out.length > 0, text: out };
}

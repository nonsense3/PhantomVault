import "server-only";
import type { IocType } from "@/lib/types";

export interface ExtractedIoc {
  type: IocType;
  value: string;
  confidence: number;
}

/**
 * Deterministic indicator extraction (PRD TI-1). It runs on every attacker
 * message regardless of which AI engine is active, so evidence capture never
 * depends on the model. Model-suggested indicators are merged on top.
 */

const TLDS =
  "com|net|org|io|co|xyz|top|info|biz|ru|cn|app|online|site|support|help|live|me|us|uk|in|cc|tk|ml|ga|cf|gq|pw|shop|store|link|click|club|vip|win|bid|loan|work|today|services|secure|account|finance|money|bank|pro|tech|cloud|digital|ws|su|to";

const RE = {
  url: /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]]+/gi,
  email: /\b[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,24}\b/gi,
  ethWallet: /\b0x[a-fA-F0-9]{40}\b/g,
  btcWallet: /\b(?:bc1[a-z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g,
  tronWallet: /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/g,
  iban: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
  accountNo: /\b(?:account|acct|a\/c)(?:\s*(?:number|no\.?|#))?\s*[:\-]?\s*(\d[\d\s-]{5,20}\d)/gi,
  routing: /\b(?:routing|aba|sort\s*code|ifsc|swift|bic)(?:\s*(?:number|no\.?|code))?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s-]{3,14}[A-Z0-9])/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
  domain: new RegExp(`\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:${TLDS})\\b`, "gi"),
  phone: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}\b|\+\d{9,15}\b/g,
};

const PRIVATE_IP = /^(?:10\.|127\.|0\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

function mask(text: string, start: number, len: number): string {
  return text.slice(0, start) + " ".repeat(len) + text.slice(start + len);
}

export function extractIocs(input: string): ExtractedIoc[] {
  const found = new Map<string, ExtractedIoc>();
  let text = input;

  const add = (type: IocType, raw: string, confidence: number) => {
    const value = normalise(type, raw);
    if (!value) return;
    const key = `${type}:${value.toLowerCase()}`;
    const prev = found.get(key);
    if (!prev || prev.confidence < confidence) found.set(key, { type, value, confidence });
  };

  const take = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    re.lastIndex = 0;
    const matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push(m);
      if (m[0].length === 0) re.lastIndex++;
    }
    for (const match of matches) {
      fn(match);
      text = mask(text, match.index, match[0].length);
    }
  };

  take(RE.url, (m) => {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    add("url", url, 0.95);
    const host = hostOf(url);
    if (host) add("domain", host, 0.85);
  });
  take(RE.email, (m) => {
    add("email", m[0], 0.95);
    const domain = m[0].split("@")[1];
    if (domain && !isFreemail(domain)) add("domain", domain, 0.7);
  });
  take(RE.ethWallet, (m) => add("wallet", m[0], 0.95));
  take(RE.btcWallet, (m) => {
    if (/\d/.test(m[0]) && /[a-z]/i.test(m[0])) add("wallet", m[0], 0.85);
  });
  take(RE.tronWallet, (m) => {
    if (/\d/.test(m[0])) add("wallet", m[0], 0.8);
  });
  take(RE.iban, (m) => {
    if (/\d{6,}/.test(m[0].replace(/\s/g, "").slice(4)) || m[0].replace(/\s/g, "").length >= 15)
      add("bank", `IBAN ${m[0].replace(/\s+/g, " ").toUpperCase()}`, 0.85);
  });
  take(RE.accountNo, (m) => add("bank", `Account ${m[1].replace(/[\s-]/g, "")}`, 0.8));
  take(RE.routing, (m) => {
    const label = m[0].split(/[:\-\s]/)[0].toUpperCase();
    add("bank", `${label} ${m[1].replace(/\s+/g, "").toUpperCase()}`, 0.75);
  });
  take(RE.ipv4, (m) => add("ip", m[0], PRIVATE_IP.test(m[0]) ? 0.4 : 0.9));
  take(RE.domain, (m) => add("domain", m[0], 0.75));
  take(RE.phone, (m) => {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) add("phone", m[0].trim(), m[0].trim().startsWith("+") ? 0.85 : 0.65);
  });

  return [...found.values()];
}

function normalise(type: IocType, raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  switch (type) {
    case "email":
      return v.toLowerCase();
    case "domain":
      return v.toLowerCase().replace(/^www\./, "");
    case "phone":
      return v.replace(/\s{2,}/g, " ");
    default:
      return v;
  }
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `http://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const FREEMAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
  "yandex.ru",
]);

function isFreemail(domain: string) {
  return FREEMAIL.has(domain.toLowerCase());
}

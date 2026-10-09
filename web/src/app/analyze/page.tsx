"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ShieldAlert,
  Upload,
  ArrowRight,
  AlertTriangle,
  Fingerprint,
  Zap,
  CheckCircle,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

export default function AnalyzerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"text" | "url" | "image">("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [imageFile, setImageFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  const sampleScamTexts = [
    {
      label: "AML Escrow Scam",
      text: "From: finance@global-escrow-security.com\nSubject: URGENT: $94,000 Payout Awaiting Clearance\n\nDear Beneficiary, your escrow transfer has cleared audit. To receive the disbursement, pay the $450 anti-money laundering certificate fee to USDT wallet 0x71C8360f38bB186e8A99B8aF5aC7D913f019Fa3E within 24 hours.",
    },
    {
      label: "Bank Phishing SMS",
      text: "NORTHWIND ALERT: An unauthorized withdrawal of $1,280 was detected from your checking account. Call +1 (800) 555-0199 or visit https://secure-northwind-auth.com/verify to prevent permanent suspension.",
    },
    {
      label: "Overdue Invoice",
      text: "Attn Accounts Payable: Invoice INV-88219 is now 14 days overdue. Please remit the remaining balance of $2,450 to updated ACH routing 021000021 account 88391204 immediately to avoid collections.",
    },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5MB size limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setImageFile({
        name: file.name,
        base64,
        mimeType: file.type || "image/png",
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const payload: {
        text?: string;
        url?: string;
        image?: { mimeType: string; base64Data: string };
      } = {};

      if (activeTab === "text") payload.text = text;
      if (activeTab === "url") payload.url = url;
      if (activeTab === "image" && imageFile) {
        payload.image = {
          mimeType: imageFile.mimeType,
          base64Data: imageFile.base64,
        };
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data.result);
      if (data.analysis?.id) {
        setAnalysisId(data.analysis.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTurnIntoDecoy = () => {
    if (!result) return;
    const params = new URLSearchParams({
      scamType: result.scam_type,
      persona: result.suggested_persona,
      template: result.suggested_template,
      opener: result.suggested_opener,
      ...(analysisId ? { sourceAnalysisId: analysisId } : {}),
    });
    router.push(`/traps/new?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-12 border-b border-[var(--border-color)]">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-[var(--accent-cobalt)]" />
              <span className="grid-sidebar-label">THREAT DISSECTION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mt-4">
              SCAM ANALYZER
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">
              Feed raw suspicious emails, text messages, URLs, or screenshot evidence to our multimodal model. Dissect red flags, identify phishing techniques, extract forensic IoCs, and spawn an adaptive honeypot with a single click.
            </p>
          </div>

          <div className="pt-8 border-t border-[var(--border-color)] space-y-3">
            <span className="grid-sidebar-label block">LOAD SAMPLE THREAT</span>
            <div className="space-y-2">
              {sampleScamTexts.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setActiveTab("text");
                    setText(sample.text);
                    setError(null);
                  }}
                  className="w-full text-left p-2.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] text-xs font-mono transition-colors"
                >
                  <div className="font-bold text-[var(--accent-cobalt)]">{sample.label}</div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate">{sample.text.slice(0, 45)}...</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input & Results (Cols 5-12) */}
        <div className="col-span-12 md:col-span-8 p-8 md:p-12 space-y-8">
          {/* Tab selector */}
          <div className="flex border-b border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab("text")}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "text"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FileText className="w-4 h-4" /> Message Text
            </button>
            <button
              onClick={() => setActiveTab("image")}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "image"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Screenshot (Vision)
            </button>
            <button
              onClick={() => setActiveTab("url")}
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "url"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Suspicious Link
            </button>
          </div>

          {error && (
            <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            {activeTab === "text" && (
              <div>
                <label className="grid-sidebar-label block mb-2">RAW SUSPICIOUS MESSAGE TEXT</label>
                <textarea
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the suspicious email, SMS, DM, or recovery request here..."
                  className="w-full p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  required={activeTab === "text"}
                />
              </div>
            )}

            {activeTab === "image" && (
              <div>
                <label className="grid-sidebar-label block mb-2">UPLOAD SCREENSHOT (MULTIMODAL VISION)</label>
                <div className="border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] p-8 text-center">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="screenshot-input"
                  />
                  <label htmlFor="screenshot-input" className="cursor-pointer flex flex-col items-center">
                    <Upload className="w-8 h-8 text-[var(--text-muted)] mb-3" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      {imageFile ? imageFile.name : "Select Screenshot (PNG / JPG up to 5MB)"}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                      Our vision engine reads text, detects spoofed logos, and inspects deceptive UI elements
                    </span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === "url" && (
              <div>
                <label className="grid-sidebar-label block mb-2">SUSPICIOUS URL OR DOMAIN</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://verify-northwind-secure-portal.com/login"
                  className="w-full p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  required={activeTab === "url"}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="poster-btn w-full sm:w-auto"
            >
              {loading ? "Analysing Threat Matrix..." : "Run Threat Analysis"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* ============================================================= */}
          {/* ANALYSIS RESULTS CARD                                         */}
          {/* ============================================================= */}
          {result && (
            <div className="border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 border ${
                        result.threat_level === "High"
                          ? "threat-high"
                          : result.threat_level === "Medium"
                          ? "threat-medium"
                          : "threat-low"
                      }`}
                    >
                      {result.threat_level.toUpperCase()} THREAT
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                      {result.scam_type}
                    </h2>
                  </div>
                </div>

                {/* PRD AN-4: One-click "Turn into decoy" */}
                <button
                  onClick={handleTurnIntoDecoy}
                  type="button"
                  className="poster-btn poster-btn-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Turn into Decoy Trap</span>
                </button>
              </div>

              {/* Summary */}
              <div>
                <span className="grid-sidebar-label block mb-2">EXECUTIVE SUMMARY</span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Red flags */}
              <div>
                <span className="grid-sidebar-label block mb-2">OBSERVED RED FLAGS</span>
                <ul className="space-y-2">
                  {result.red_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs font-mono text-[var(--text-primary)]">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Indicators of compromise */}
              {result.iocs.length > 0 && (
                <div>
                  <span className="grid-sidebar-label block mb-2">EXTRACTED INDICATORS (IOCS)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.iocs.map((ioc, idx) => (
                      <div
                        key={idx}
                        className="p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[10px] uppercase text-[var(--text-muted)] block">
                            {ioc.type}
                          </span>
                          <span className="font-bold truncate max-w-[200px] block">{ioc.value}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(ioc.confidence * 100)}% CONF
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested configuration preview */}
              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono space-y-1">
                <span className="text-[var(--text-muted)] block mb-1 uppercase font-bold">
                  RECOMMENDED DECOY CONFIGURATION:
                </span>
                <div>Archetype: <span className="font-bold text-[var(--accent-cobalt)]">{result.suggested_persona}</span></div>
                <div>Template: <span className="font-bold text-[var(--accent-cobalt)]">{result.suggested_template}</span></div>
                <div className="pt-2 text-[var(--text-secondary)] italic">
                  Opener: "{result.suggested_opener}"
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

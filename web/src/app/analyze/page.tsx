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
  Paperclip,
  FileWarning,
  ShieldX,
  Copy,
  Check,
  Bug,
  X,
  Globe,
  Sparkles,
  Cloud,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/types";

export default function AnalyzerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"attachment" | "text" | "url" | "image">("attachment");
  const [attachmentScanMode, setAttachmentScanMode] = useState<"metadata" | "link" | "upload">("metadata");

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [imageFile, setImageFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);

  // Attachment scanner state (Zero-download inspection)
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentContextText, setAttachmentContextText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<{
    name: string;
    size: number;
    base64: string;
    mimeType: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

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
    {
      label: "Benign Work Email (Safe / No Threat)",
      text: "From: sarah.jenkins@acmecorp.internal\nSubject: Team lunch on Thursday\n\nHey everyone, let's meet at 12:30 PM in the cafeteria for our weekly sprint recap and lunch. No preparation needed!",
    },
  ];

  const sampleAttachments = [
    {
      label: "Invoice_INV-9821.pdf.exe",
      badge: "Double Extension Trojan",
      mode: "metadata" as const,
      name: "Invoice_INV-9821.pdf.exe",
      emailContext:
        "From: billing@quickbooks-invoicing.net\nSubject: URGENT: Invoice INV-9821 payment required within 24 hours\n\nDear Customer, please see the attached payment invoice INV-9821.exe. Failure to settle immediately will result in collections.",
      size: 493568,
      mimeType: "application/x-msdownload",
      base64: "TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAA4fug4AtAnNIbgBTM0hVGhpcyBwcm9ncmFtIGNhbm5vdCBiZSBydW4gaW4gRE9TIG1vZGUuDQ0K",
    },
    {
      label: "Remittance_Advice.xlsm",
      badge: "VBA Macro Dropper",
      mode: "metadata" as const,
      name: "Remittance_Advice.xlsm",
      emailContext:
        "From: wire-transfers@global-settlement.com\nSubject: Remittance Advice for Batch #8812\n\nPlease find attached the remittance statement for your upcoming wire. Enable macros to verify transaction certificate.",
      size: 184320,
      mimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
      base64: "UEsDBAR4bC92YmFQcm9qZWN0LmJpbiBTdWIgQXV0b09wZW4oKSBTaGVsbCgncG93ZXJzaGVsbCAtdyBoaWRkZW4gLWVuYyBKQUJ3WTJGd2JHd0EnKSBFbmQgU3Vi",
    },
    {
      label: "Remote Cloud File (URL)",
      badge: "Zero-Download Link",
      mode: "link" as const,
      name: "Court_Subpoena_Notice.pdf",
      url: "https://secure-fileshare-portal.com/download/Court_Subpoena_Notice.pdf",
      emailContext:
        "From: legal-notices@district-court-docket.org\nSubject: Notice of Appearance & Subpoena #8821\n\nDownload the official sealed docket from the secure file link below. Immediate compliance required.",
      size: 89400,
      mimeType: "application/pdf",
      base64: "JVBERi0xLjcKMSAwIG9iajw8IC9UeXBlIC9DYXRhbG9nIC9PcGVuQWN0aW9uIDw8IC9TIC9MYXVuY2ggL0YgKGNtZC5leGUpIC9QICgvYyBwb3dlcnNoZWxsKSA+PiAvQUEgPDwgL08gPDwgL1MgL0phdmFTY3JpcHQgL0pTIChhcHAuYWxlcnQoJ0NvbXByb21pc2VkJykpID4+ID4+ID4+CmVuZG9iag==",
    },
    {
      label: "Shipping_Documents.iso",
      badge: "MOTW Evasion Container",
      mode: "metadata" as const,
      name: "Shipping_Documents.iso",
      emailContext:
        "From: tracking@dhl-express-dispatch.net\nSubject: Delivery Exception: Shipping Documents Required\n\nYour package is held at customs. Mount the shipping documents container to inspect bill of lading.",
      size: 1540000,
      mimeType: "application/x-iso9660-image",
      base64: "Q0QwMDEgSVNPOTY2MCBjb250YWluZXIgcGF5bG9hZCBwYWNrYWdpbmcgaGlkZGVuIGJhdGNoIGxhdW5jaGVy",
    },
  ];

  // Immediately run sample scan on click
  const runSampleAttachmentScan = async (sample: typeof sampleAttachments[0]) => {
    setActiveTab("attachment");
    setAttachmentScanMode(sample.mode);
    setAttachmentName(sample.name);
    setAttachmentContextText(sample.emailContext);
    if (sample.url) setAttachmentUrl(sample.url);
    const fileObj = {
      name: sample.name,
      size: sample.size,
      base64: sample.base64,
      mimeType: sample.mimeType,
    };
    setAttachmentFile(fileObj);
    setImageFile(null);
    setText("");
    setUrl("");
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sample.emailContext,
          attachment: {
            name: sample.name,
            size: sample.size,
            mimeType: sample.mimeType,
            base64Data: sample.base64,
            url: sample.url,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setResult(data.result);
      if (data.analysis?.id) setAnalysisId(data.analysis.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

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

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError("Attachment exceeds 25MB safety scanning threshold");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setAttachmentFile({
        name: file.name,
        size: file.size,
        base64,
        mimeType: file.type || "application/octet-stream",
      });
      setAttachmentName(file.name);
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
        attachment?: {
          name: string;
          size?: number;
          mimeType?: string;
          base64Data?: string;
          url?: string;
        };
      } = {};

      if (activeTab === "attachment") {
        if (attachmentScanMode === "link") {
          if (!attachmentUrl.trim()) {
            throw new Error("Please enter an attachment download link or webmail URL");
          }
          payload.attachment = {
            name: attachmentName.trim() || attachmentUrl.split("/").filter(Boolean).pop() || "remote_attachment.bin",
            url: attachmentUrl.trim(),
            base64Data: attachmentFile?.base64,
          };
          payload.text = attachmentContextText.trim() || undefined;
        } else if (attachmentScanMode === "metadata") {
          if (!attachmentName.trim()) {
            throw new Error("Please enter the attachment filename displayed in your email (e.g. Invoice.pdf.exe)");
          }
          payload.attachment = {
            name: attachmentName.trim(),
            base64Data: attachmentFile?.base64,
            size: attachmentFile?.size,
            mimeType: attachmentFile?.mimeType,
          };
          payload.text = attachmentContextText.trim() || undefined;
        } else if (attachmentScanMode === "upload") {
          if (!attachmentFile) {
            throw new Error("Please select an attachment file to inspect");
          }
          payload.attachment = {
            name: attachmentFile.name,
            size: attachmentFile.size,
            mimeType: attachmentFile.mimeType,
            base64Data: attachmentFile.base64,
          };
          payload.text = attachmentContextText.trim() || undefined;
        }
      } else if (activeTab === "text") {
        payload.text = text;
      } else if (activeTab === "url") {
        payload.url = url;
      } else if (activeTab === "image" && imageFile) {
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

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(type);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const copyIncidentReport = () => {
    if (!result) return;
    const scan = result.attachment_scan;
    const report = [
      "===========================================================",
      "PHANTOM VAULT FORENSIC THREAT & QUARANTINE REPORT",
      "ANALYZED BY: GEMMA 4 NEURAL THREAT INTELLIGENCE",
      "===========================================================",
      `Date: ${new Date().toISOString()}`,
      `Verdict: ${scan?.verdict || result.threat_level.toUpperCase()}`,
      `Threat Level: ${result.threat_level.toUpperCase()}`,
      `Classification: ${result.scam_type}`,
      `File Name: ${scan?.fileName || "N/A"}`,
      `File Size: ${scan?.formattedSize || "N/A"}`,
      `Magic Header: ${scan?.magicHeader || "N/A"}`,
      `SHA-256 Hash: ${scan?.sha256 || "N/A"}`,
      `MD5 Hash: ${scan?.md5 || "N/A"}`,
      "",
      "MANDATORY SECURITY DIRECTIVE:",
      "DO NOT DOWNLOAD OR EXECUTE THIS ATTACHMENT LOCALLY ON YOUR COMPUTER.",
      "",
      "DETECTED VULNERABILITIES & EXPLOIT PRIMITIVES:",
      ...(scan?.vulnerabilities.map((v) => `[${v.severity}] ${v.id} - ${v.title}: ${v.description}`) || []),
      "",
      "EXECUTIVE SUMMARY (GEMMA 4):",
      result.summary,
      "",
      "RED FLAGS:",
      ...result.red_flags.map((rf) => `- ${rf}`),
      "",
      "EXTRACTED IOCS:",
      ...result.iocs.map((ioc) => `[${ioc.type}] ${ioc.value} (Confidence: ${Math.round(ioc.confidence * 100)}%)`),
      "===========================================================",
    ].join("\n");

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
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
              <span className="grid-sidebar-label">THREAT DISSECTION & FORENSICS</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mt-4">
              THREAT ANALYZER
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">
              Safely inspect suspicious email attachments, malicious links, phishing texts, and screenshot lures using <strong className="text-[var(--text-primary)]">Gemma 4</strong> intelligence. <span className="text-rose-500 font-bold">Zero local downloads required:</span> our cloud sandbox inspects links, metadata, and bytecode so hazardous payloads never touch your personal computer.
            </p>
          </div>

          <div className="pt-8 border-t border-[var(--border-color)] space-y-6">
            {/* Quick Test Samples */}
            <div>
              <span className="grid-sidebar-label block mb-2 text-rose-500 font-bold">
                1-CLICK TEST SAMPLES (RUNS IMMEDIATELY)
              </span>
              <div className="space-y-2">
                {sampleAttachments.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => runSampleAttachmentScan(sample)}
                    className="w-full text-left p-2.5 border border-[var(--border-color)] hover:border-rose-500 bg-[var(--bg-surface)] text-xs font-mono transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-rose-500 truncate max-w-[170px]">
                        {sample.label}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 border border-rose-500/30 text-rose-400 bg-rose-500/10 uppercase">
                        {sample.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                      Click to run instant threat scan
                    </div>

                  </button>
                ))}
              </div>
            </div>

            {/* Sample Scam Messages */}
            <div>
              <span className="grid-sidebar-label block mb-2">LOAD SAMPLE TEXT THREAT</span>
              <div className="space-y-2">
                {sampleScamTexts.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setActiveTab("text");
                      setText(sample.text);
                      setImageFile(null);
                      setAttachmentFile(null);
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
        </div>

        {/* Input & Results (Cols 5-12) */}
        <div className="col-span-12 md:col-span-8 p-8 md:p-12 space-y-8">
          {/* Main Tab selector */}
          <div className="flex flex-wrap border-b border-[var(--border-color)]">
            <button
              onClick={() => {
                setActiveTab("attachment");
                setImageFile(null);
              }}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "attachment"
                  ? "border-rose-500 text-rose-500 bg-rose-500/5"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FileWarning className="w-4 h-4 text-rose-500" />
              <span>Email Attachment Scanner</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-rose-500 text-white font-mono">ZERO DOWNLOAD</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("text");
                setImageFile(null);
                setAttachmentFile(null);
              }}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "text"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <FileText className="w-4 h-4" /> Message Text
            </button>
            <button
              onClick={() => {
                setActiveTab("url");
                setImageFile(null);
                setAttachmentFile(null);
              }}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "url"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Suspicious Link
            </button>
            <button
              onClick={() => {
                setActiveTab("image");
                setAttachmentFile(null);
              }}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === "image"
                  ? "border-[var(--accent-cobalt)] text-[var(--accent-cobalt)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Screenshot (Vision)
            </button>
          </div>

          {error && (
            <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Attachment Scanner Tab */}
            {activeTab === "attachment" && (
              <div className="space-y-6">
                {/* Zero Download Protection Banner */}
                <div className="p-4 border border-rose-500/40 bg-rose-500/5 flex items-start gap-3">
                  <ShieldX className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-rose-500 uppercase tracking-wider font-mono flex items-center gap-2">
                      <span>ZERO-DOWNLOAD PROTECTION • POWERED BY GEMMA 4</span>
                      <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px]">ISOLATED</span>
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      <strong className="text-[var(--text-primary)]">You do NOT need to download suspicious email attachments to your computer.</strong> Choose an option below to let Phantom Vault and Gemma 4 dissect the threat safely: enter the filename displayed in your inbox, paste the webmail download link, or upload the file directly.
                    </p>
                  </div>
                </div>

                {/* Sub-mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-[var(--border-color)] p-1.5 bg-[var(--bg-surface)]">
                  <button
                    type="button"
                    onClick={() => setAttachmentScanMode("metadata")}
                    className={`p-2.5 text-xs font-mono uppercase tracking-wide text-center transition-colors flex items-center justify-center gap-1.5 ${
                      attachmentScanMode === "metadata"
                        ? "bg-rose-500 text-white font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>1. Inbox Name & Email Text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentScanMode("link")}
                    className={`p-2.5 text-xs font-mono uppercase tracking-wide text-center transition-colors flex items-center justify-center gap-1.5 ${
                      attachmentScanMode === "link"
                        ? "bg-rose-500 text-white font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>2. Attachment Link / URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentScanMode("upload")}
                    className={`p-2.5 text-xs font-mono uppercase tracking-wide text-center transition-colors flex items-center justify-center gap-1.5 ${
                      attachmentScanMode === "upload"
                        ? "bg-rose-500 text-white font-bold"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>3. Upload File (Memory Scan)</span>
                  </button>
                </div>

                {/* Mode 1: Inbox Metadata & Filename (Zero-Download Gemma 4 AI Scan) */}
                {attachmentScanMode === "metadata" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="grid-sidebar-label">ATTACHMENT FILENAME DISPLAYED IN EMAIL</label>
                        <span className="text-[10px] text-emerald-400 font-mono">100% Safe • Never Download To PC</span>
                      </div>
                      <input
                        type="text"
                        value={attachmentName}
                        onChange={(e) => setAttachmentName(e.target.value)}
                        placeholder="e.g. Invoice_INV-9821.pdf.exe or Wire_Remittance_2026.xlsm or Subpoena.pdf"
                        className="w-full p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-rose-500 rounded-none font-bold"
                        required={attachmentScanMode === "metadata"}
                      />
                      <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1 block">
                        Gemma 4 checks for deceptive double extensions (.pdf.exe), macro formats (.xlsm), PE signatures, and container evasion (.iso/.vhd).
                      </span>
                    </div>

                    <div>
                      <label className="grid-sidebar-label block mb-2">EMAIL BODY, SUBJECT & SENDER ADDRESS</label>
                      <textarea
                        rows={4}
                        value={attachmentContextText}
                        onChange={(e) => setAttachmentContextText(e.target.value)}
                        placeholder="Paste the email text from your inbox (e.g. 'From: billing@quickbooks-invoicing.net Subject: OVERDUE INVOICE Please find attached...')"
                        className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-rose-500 rounded-none"
                        required={attachmentScanMode === "metadata"}
                      />
                    </div>
                  </div>
                )}

                {/* Mode 2: Remote Link / Webmail Download URL */}
                {attachmentScanMode === "link" && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="grid-sidebar-label">ATTACHMENT DOWNLOAD LINK OR CLOUD URL</label>
                        <span className="text-[10px] text-rose-400 font-mono">Cloud Sandbox Inspection (No PC Download)</span>
                      </div>
                      <input
                        type="url"
                        value={attachmentUrl}
                        onChange={(e) => setAttachmentUrl(e.target.value)}
                        placeholder="Right-click attachment in Gmail/Outlook -> 'Copy link address' or paste cloud link (e.g. https://files.com/Invoice.pdf.exe)"
                        className="w-full p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-rose-500 rounded-none"
                        required={attachmentScanMode === "link"}
                      />
                    </div>

                    <div>
                      <label className="grid-sidebar-label block mb-2">ATTACHMENT FILENAME (OPTIONAL)</label>
                      <input
                        type="text"
                        value={attachmentName}
                        onChange={(e) => setAttachmentName(e.target.value)}
                        placeholder="e.g. Invoice_INV-9821.pdf.exe or Payment_Receipt.xlsm"
                        className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono focus:outline-none focus:border-rose-500 rounded-none"
                      />
                    </div>

                    <div>
                      <label className="grid-sidebar-label block mb-2">EMAIL MESSAGE TEXT / SENDER (OPTIONAL CONTEXT)</label>
                      <textarea
                        rows={3}
                        value={attachmentContextText}
                        onChange={(e) => setAttachmentContextText(e.target.value)}
                        placeholder="Paste the email subject, sender address, and body text for Gemma 4 to correlate the social engineering lure..."
                        className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono focus:outline-none focus:border-rose-500 rounded-none"
                      />
                    </div>
                  </div>
                )}

                {/* Mode 3: Direct File Upload */}
                {attachmentScanMode === "upload" && (
                  <div className="space-y-4">
                    <label className="grid-sidebar-label block">UPLOAD FILE FOR IN-MEMORY ZERO-EXECUTION BYTECODE SCAN</label>
                    <div className="border border-dashed border-[var(--border-color)] hover:border-rose-500/70 bg-[var(--bg-surface)] p-8 text-center transition-colors">
                      <input
                        type="file"
                        onChange={handleAttachmentUpload}
                        className="hidden"
                        id="attachment-input"
                      />
                      <label htmlFor="attachment-input" className="cursor-pointer flex flex-col items-center">
                        <Paperclip className="w-8 h-8 text-rose-500 mb-3" />
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                          {attachmentFile
                            ? `${attachmentFile.name} (${(attachmentFile.size / 1024).toFixed(1)} KB)`
                            : "Click to select or drag & drop attachment (.exe, .pdf, .docx, .iso, etc.)"}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                          Pure in-memory bytecode inspection • Up to 25MB • Zero local OS execution
                        </span>
                      </label>
                    </div>

                    {attachmentFile && (
                      <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="font-bold truncate">{attachmentFile.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            ({(attachmentFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAttachmentFile(null)}
                          className="p-1 hover:text-red-400 text-[var(--text-muted)]"
                          title="Clear file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message Text Tab */}
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

            {/* Suspicious URL Tab */}
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

            {/* Screenshot Vision Tab */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="grid-sidebar-label">UPLOAD SCREENSHOT (MULTIMODAL GEMMA 4 VISION)</label>
                    <span className="text-[10px] text-emerald-400 font-mono">Multimodal Threat Verifier</span>
                  </div>
                  <div className="border border-dashed border-[var(--border-color)] hover:border-[var(--accent-cobalt)]/60 bg-[var(--bg-surface)] p-8 text-center transition-colors">
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
                        {imageFile ? imageFile.name : "Select Screenshot (PNG / JPG / WebP up to 5MB)"}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                        Gemma 4 verifies if the image is a phishing lure vs. a random benign picture
                      </span>
                    </label>
                  </div>
                </div>

                {imageFile && (
                  <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3 truncate">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:${imageFile.mimeType};base64,${imageFile.base64}`}
                        alt="Screenshot Preview"
                        className="w-12 h-12 object-cover border border-[var(--border-color)] rounded-none flex-shrink-0"
                      />
                      <div className="truncate">
                        <span className="font-bold block truncate">{imageFile.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Image ready for Gemma 4 visual inspection</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="p-1 hover:text-red-400 text-[var(--text-muted)]"
                      title="Clear image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="poster-btn w-full sm:w-auto"
            >
              {loading ? (
                <span>Analyzing Threat...</span>
              ) : activeTab === "attachment" ? (
                <>
                  <span>Scan Attachment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Analyze Threat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* ============================================================= */}
          {/* ANALYSIS RESULTS CARD                                         */}
          {/* ============================================================= */}
          {result && (
            <div className="border border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 md:p-8 space-y-6 animate-in fade-in duration-300">
              {/* Header */}
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
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-[var(--accent-cobalt)] font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>FORENSIC THREAT DISSECTION • POWERED BY GEMMA 4 NEURAL ENGINE</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={copyIncidentReport}
                    type="button"
                    className="px-3 py-2 border border-[var(--border-color)] hover:border-[var(--border-strong)] text-xs font-mono flex items-center gap-1.5 transition-colors"
                    title="Copy SOC / IT Quarantine Report"
                  >
                    {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReport ? "Report Copied" : "Copy Incident Report"}</span>
                  </button>
                </div>
              </div>

              {/* DIRECTIVE FOR ATTACHMENTS (CLEAN vs MALICIOUS) */}
              {result.attachment_scan && (
                (() => {
                  const isClean =
                    (result.threat_level || "").toLowerCase() === "low" ||
                    (result.attachment_scan.verdict || "").toUpperCase() === "CLEAN" ||
                    result.scam_type.toLowerCase().includes("safe") ||
                    result.scam_type.toLowerCase().includes("clean") ||
                    (result.attachment_scan.riskScore ?? 0) <= 30;

                  if (isClean) {
                    return (
                      <div className="border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3 font-mono">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm sm:text-base font-bold text-emerald-400 uppercase tracking-wide">
                              ✓ VERIFIED SAFE: LINK / ATTACHMENT IS CLEAN
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium leading-relaxed">
                              {result.attachment_scan.doNotDownloadWarning || "Forensic bytecode and header inspection detected no malicious payloads, weaponized macros, or deceptive masquerading. This link/attachment has passed security checks and is safe."}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-emerald-500/20 pt-3 flex flex-wrap items-center gap-4 text-xs text-emerald-400/90">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Bytecode & Header Check: Passed
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            Zero Weaponized Macros / Exploits
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            File Signature & Extension: Verified
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="border-2 border-rose-500 bg-rose-500/10 p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <ShieldX className="w-7 h-7 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <div className="text-sm sm:text-base font-black text-rose-500 uppercase tracking-wide font-mono">
                            {result.attachment_scan.verdict === "MALICIOUS"
                              ? "⛔ CRITICAL DIRECTIVE: DO NOT DOWNLOAD OR EXECUTE THIS FILE LOCALLY"
                              : "⚠️ CAUTION: SUSPICIOUS ATTACHMENT QUARANTINE DIRECTIVE"}
                          </div>
                          <p className="text-xs text-[var(--text-primary)] mt-1 font-mono font-medium leading-relaxed">
                            {result.attachment_scan.doNotDownloadWarning}
                          </p>
                        </div>
                      </div>

                      {result.attachment_scan.quarantineProtocols.length > 0 && (
                        <div className="border-t border-rose-500/30 pt-3">
                          <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider block mb-2">
                            MANDATORY QUARANTINE PROTOCOLS (NO LOCAL DOWNLOAD)
                          </span>
                          <ul className="space-y-1.5">
                            {result.attachment_scan.quarantineProtocols.map((protocol, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs font-mono text-[var(--text-secondary)]">
                                <span className="text-rose-500 font-bold">•</span>
                                <span>{protocol}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}

              {/* FORENSIC TELEMETRY CARD (If Attachment Scan) */}
              {result.attachment_scan && (
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                    <span className="grid-sidebar-label text-[var(--accent-cobalt)]">
                      CLOUD FORENSIC FILE TELEMETRY
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 border ${
                        result.attachment_scan.riskScore >= 70
                          ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          : result.attachment_scan.riskScore >= 40
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                      }`}
                    >
                      RISK SCORE: {result.attachment_scan.riskScore} / 100 ({result.attachment_scan.verdict})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">FILE NAME</span>
                      <span className="font-bold truncate block">{result.attachment_scan.fileName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">FILE SIZE</span>
                      <span className="font-bold">{result.attachment_scan.formattedSize}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">DETECTED TYPE</span>
                      <span className="font-bold">{result.attachment_scan.fileType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">MAGIC BYTE HEADER</span>
                      <span className="font-bold text-[var(--text-secondary)] truncate block">
                        {result.attachment_scan.magicHeader}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Hashes */}
                  <div className="pt-2 border-t border-[var(--border-color)] grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                      <div className="truncate pr-2">
                        <span className="text-[9px] text-[var(--text-muted)] block">SHA-256 FINGERPRINT</span>
                        <span className="font-mono text-[10px] text-[var(--text-primary)] truncate block">
                          {result.attachment_scan.sha256}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.attachment_scan!.sha256, "sha256")}
                        className="p-1 hover:text-[var(--accent-cobalt)] text-[var(--text-muted)]"
                        title="Copy SHA-256"
                      >
                        {copiedHash === "sha256" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-2 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                      <div className="truncate pr-2">
                        <span className="text-[9px] text-[var(--text-muted)] block">MD5 HASH</span>
                        <span className="font-mono text-[10px] text-[var(--text-primary)] truncate block">
                          {result.attachment_scan.md5}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result.attachment_scan!.md5, "md5")}
                        className="p-1 hover:text-[var(--accent-cobalt)] text-[var(--text-muted)]"
                        title="Copy MD5"
                      >
                        {copiedHash === "md5" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* DETECTED VULNERABILITIES & CVE INDICATORS */}
              {result.attachment_scan && result.attachment_scan.vulnerabilities.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bug className="w-4 h-4 text-rose-500" />
                    <span className="grid-sidebar-label text-rose-500">
                      IDENTIFIED VULNERABILITIES & ATTACK TECHNIQUES ({result.attachment_scan.vulnerabilities.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {result.attachment_scan.vulnerabilities.map((vuln, idx) => (
                      <div
                        key={idx}
                        className="p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1 font-mono text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 border uppercase ${
                                vuln.severity === "CRITICAL"
                                  ? "border-red-500 bg-red-500/10 text-red-400"
                                  : vuln.severity === "HIGH"
                                  ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                  : "border-yellow-500 bg-yellow-500/10 text-yellow-400"
                              }`}
                            >
                              {vuln.severity}
                            </span>
                            <span className="font-bold text-[var(--accent-cobalt)]">{vuln.id}</span>
                            <span className="font-bold text-[var(--text-primary)]">{vuln.title}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed pt-1">
                          {vuln.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DETECTED TRIGGER TAGS */}
              {result.attachment_scan && result.attachment_scan.detectedTriggers.length > 0 && (
                <div>
                  <span className="grid-sidebar-label block mb-2">EXTRACTED EXPLOIT INDICATORS</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.attachment_scan.detectedTriggers.map((trig, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 border border-rose-500/30 bg-rose-500/10 text-rose-400"
                      >
                        {trig}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Executive Summary by Gemma 4 */}
              <div>
                <span className="grid-sidebar-label block mb-2">GEMMA 4 EXECUTIVE THREAT DISSECTION</span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Red flags */}
              <div>
                <span className="grid-sidebar-label block mb-2">OBSERVED RED FLAGS</span>
                {result.red_flags.length > 0 ? (
                  <ul className="space-y-2">
                    {result.red_flags.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs font-mono text-[var(--text-primary)]">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{flag}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-3 border border-emerald-500/30 bg-emerald-500/5 text-xs font-mono text-emerald-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>No red flags detected. The analyzed input shows no phishing or scam indicators.</span>
                  </div>
                )}
              </div>

              {/* Indicators of compromise */}
              {result.iocs.length > 0 && (
                <div>
                  <span className="grid-sidebar-label block mb-2">EXTRACTED TECHNICAL INDICATORS (IOCS)</span>
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

              {/* TACTICAL COUNTERMEASURE (HONEYPOT DECOY) - Clearly separated */}
              {(() => {
                const isBenign =
                  (result.threat_level || "").toLowerCase() === "low" ||
                  result.scam_type.toLowerCase().includes("no threat") ||
                  result.scam_type.toLowerCase().includes("safe") ||
                  result.scam_type.toLowerCase().includes("clean");

                return (
                  <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                      <span className="font-bold text-[var(--accent-cobalt)] uppercase">
                        TACTICAL COUNTERMEASURE: HONEYPOT DECOY
                      </span>
                      <span className={`text-[10px] font-bold ${isBenign ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
                        {isBenign ? "NOT REQUIRED (VERIFIED SAFE)" : "OPTIONAL ATTACK RETALIATION"}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                      {isBenign
                        ? "No tactical countermeasure required: This artifact does not appear to be an active threat or phishing communication. Honeypot decoy traps are only deployed against active threats and adversarial attacks."
                        : "Do not interact with the attacker directly on your real email. Instead, spawn an automated Phantom Vault decoy trap to bait the sender, waste their time, and capture real-time telemetry."}
                    </p>
                    {!isBenign && (
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div>Persona Archetype: <span className="font-bold text-[var(--accent-cobalt)]">{result.suggested_persona}</span></div>
                          <div>Trap Template: <span className="font-bold text-[var(--accent-cobalt)]">{result.suggested_template}</span></div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate max-w-[320px]">Opener: "{result.suggested_opener}"</div>
                        </div>
                        <button
                          onClick={handleTurnIntoDecoy}
                          type="button"
                          className="poster-btn poster-btn-sm"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Spawn Decoy Trap</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

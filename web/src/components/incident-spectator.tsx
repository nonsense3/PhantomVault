"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Download,
  Radio,
  Shield,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  Play,
  RotateCw,
  Zap,
  Lock,
  CloudUpload,
  CheckCircle2,
} from "lucide-react";
import { formatClock, formatDuration, formatTime, timeAgo } from "@/lib/format";
import type { Incident, Ioc, LiveEvent, Message, Trap } from "@/lib/types";

export function IncidentSpectator({ incidentId }: { incidentId: string }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [trap, setTrap] = useState<Trap | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [iocs, setIocs] = useState<Ioc[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [copiedIoc, setCopiedIoc] = useState<string | null>(null);
  const [secondsWasted, setSecondsWasted] = useState(0);
  const [vaulting, setVaulting] = useState(false);
  const [vaultedReportId, setVaultedReportId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchIncident = async () => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      if (res.ok) {
        const data = await res.json();
        setIncident(data.incident);
        setTrap(data.trap);
        setMessages(data.messages || []);
        setIocs(data.iocs || []);
        setSecondsWasted(data.incident?.timeWastedSeconds || 0);

        if (data.incident?.summary?.includes("[VAULTED TO CLOUD:")) {
          const match = data.incident.summary.match(/\[VAULTED TO CLOUD:\s*([^\]]+)\]/);
          if (match) setVaultedReportId(match[1]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();

    // Setup live SSE updates
    const es = new EventSource("/api/live");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as LiveEvent;
        if (event.type === "message.created" && event.message.incidentId === incidentId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.message.id)) return prev;
            return [...prev, event.message];
          });
        } else if (event.type === "incident.updated" && event.incident.id === incidentId) {
          setIncident(event.incident);
          setSecondsWasted(event.incident.timeWastedSeconds);
        } else if (event.type === "ioc.upserted" && event.ioc.incidentId === incidentId) {
          setIocs((prev) => {
            const idx = prev.findIndex((i) => i.id === event.ioc.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = event.ioc;
              return updated;
            }
            return [event.ioc, ...prev];
          });
        }
      } catch {
        // Ping
      }
    };

    return () => es.close();
  }, [incidentId]);

  // Live stopwatch when incident is active
  useEffect(() => {
    if (incident?.status !== "active") return;
    const ticker = setInterval(() => {
      setSecondsWasted((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, [incident?.status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/simulate`, { method: "POST" });
      if (res.ok) {
        await fetchIncident();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedIoc(val);
    setTimeout(() => setCopiedIoc(null), 2000);
  };

  const handleCloudVault = async () => {
    setVaulting(true);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/vault`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          alert("Authentication Required: Please sign in to vault this forensic evidence to your Supabase Cloud account.");
          window.location.href = `/login?redirect=/incidents/${incidentId}`;
          return;
        }
        throw new Error(data.error || "Failed to vault evidence to cloud");
      }
      setVaultedReportId(data.reportId || "VAULTED");
      await fetchIncident();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to vault evidence";
      alert(msg);
    } finally {
      setVaulting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center font-mono text-xs">
        CONNECTING TO TELEMETRY BUS...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-16 text-center">
        <h2 className="text-xl font-bold uppercase mb-4">Incident Not Found</h2>
        <Link href="/dashboard" className="poster-btn poster-btn-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--border-color)]">
      {/* =============================================================== */}
      {/* INCIDENT TOP HEADER (Strict Grid)                               */}
      {/* =============================================================== */}
      <div className="border-b border-[var(--border-color)] bg-[var(--bg-surface)] p-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="p-2.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors shrink-0"
              title="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 border shrink-0 ${
                    incident.threatLevel === "High"
                      ? "threat-high"
                      : incident.threatLevel === "Medium"
                      ? "threat-medium"
                      : "threat-low"
                  }`}
                >
                  {incident.threatLevel || "HIGH"} THREAT
                </span>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight truncate">
                  {incident.scamType || "Incoming Scam"} — {trap?.name || "Decoy"}
                </h1>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                <span>TARGET IP: <strong className="text-[var(--text-primary)]">{incident.sourceIp}</strong></span>
                <span>•</span>
                <span>GEO: {incident.geo?.city || "Unknown"}, {incident.geo?.country || "Proxy/VPN"}</span>
                <span>•</span>
                <span>TURNS: {messages.length}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-[var(--border-color)]">
            {/* Live Stopwatch Counter (PRD DB-5) */}
            <div className="h-10 px-3.5 border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center gap-2.5 shrink-0">
              <Clock className="w-4 h-4 text-[var(--accent-cobalt)] shrink-0" />
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[9px] uppercase text-[var(--text-muted)] tracking-wider">
                  TIME WASTED:
                </span>
                <span className="font-bold text-sm text-[var(--accent-cobalt)] tracking-tight">
                  {formatClock(secondsWasted)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="h-10 px-3.5 poster-btn-secondary poster-btn-sm flex items-center gap-2 whitespace-nowrap text-xs"
              title="Trigger simulated scammer turn for live demo"
            >
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
              <span>{simulating ? "Simulating..." : "Simulate Turn"}</span>
            </button>

            <a
              href={`/api/incidents/${incident.id}/export`}
              download
              className="h-10 px-3.5 poster-btn-secondary poster-btn-sm flex items-center gap-2 whitespace-nowrap text-xs"
              title="Download raw JSON evidence dossier to disk"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Download JSON</span>
            </a>

            <button
              onClick={handleCloudVault}
              disabled={vaulting || !!vaultedReportId}
              className={`h-10 px-3.5 poster-btn poster-btn-sm flex items-center gap-2 whitespace-nowrap text-xs ${
                vaultedReportId
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
                  : ""
              }`}
              title="Vault and sync full evidence dossier to Supabase Cloud (requires login)"
            >
              {vaultedReportId ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Vaulted ({vaultedReportId})</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-[var(--accent-cobalt)] shrink-0" />
                  <span>{vaulting ? "Vaulting..." : "Vault to Cloud"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* CAPTURED CREDENTIALS ALERT BANNER                               */}
      {/* =============================================================== */}
      {messages.some((m) => m.content.includes("[CAPTURED LOGIN CREDENTIALS]") || m.content.includes("[Form submission - login]")) && (
        <div className="border-b border-[var(--border-color)] bg-amber-500/10 p-4 border-l-4 border-l-amber-500 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold text-xs uppercase text-amber-500 tracking-wider block">
                Target Honeypot Credentials Intercepted
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                The visitor or intruder submitted credentials into your decoy login portal. The intercepted username/password has been cataloged in this incident below.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-amber-500 text-black px-2.5 py-1 font-bold uppercase tracking-wider">
            HONEYPOT TRAP TRIGGERED
          </span>
        </div>
      )}

      {/* =============================================================== */}
      {/* SPLIT-SCREEN CONVERSATION VIEW (PRD DB-3)                       */}
      {/* =============================================================== */}
      <div className="grid grid-cols-12 min-h-[680px]">
        {/* LEFT PANE: ADVERSARY / ATTACKER (Cols 1-6) */}
        <div className="col-span-12 lg:col-span-6 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] p-6 flex flex-col justify-between bg-black/[0.01] dark:bg-white/[0.01]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
            <span className="grid-sidebar-label text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-none inline-block" />
              ADVERSARY TRANSMISSION
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              CAPTURED VIA SECURE HONEYPOT
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[560px] pr-2">
            {messages.filter((m) => m.role === "attacker").length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                AWAITING FIRST INCOMING ADVERSARY PAYLOAD...
              </div>
            ) : (
              messages
                .filter((m) => m.role === "attacker")
                .map((msg) => {
                  const isCaptured =
                    msg.kind === "form_submit" ||
                    msg.content.includes("[CAPTURED") ||
                    msg.content.includes("[Form submission");
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 border ${
                        isCaptured
                          ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                          : "border-red-500/30 bg-red-500/5"
                      } text-xs font-mono space-y-2`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span
                          className={
                            isCaptured
                              ? "text-amber-500 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {isCaptured
                            ? "[CAPTURED CREDENTIALS / TELEMETRY]"
                            : `[INBOUND • ${msg.kind.toUpperCase()}]`}
                        </span>
                        <span className="text-[var(--text-muted)]">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-mono">
                        {msg.content}
                      </p>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* RIGHT PANE: DECOY PERSONA (Cols 7-12) */}
        <div className="col-span-12 lg:col-span-6 p-6 flex flex-col justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
            <span className="grid-sidebar-label text-[var(--accent-cobalt)] flex items-center gap-2">
              <span className="w-2 h-2 bg-[var(--accent-cobalt)] rounded-none inline-block animate-pulse" />
              DECOY PERSONA: {trap?.config.personaName.toUpperCase()}
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              GULLIBILITY: {trap?.gullibility}%
            </span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto max-h-[560px] pr-2">
            {messages.filter((m) => m.role === "ai").length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                DECOY STANDING BY FOR ENGAGEMENT TRIGGER...
              </div>
            ) : (
              messages
                .filter((m) => m.role === "ai")
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 border border-[var(--accent-cobalt)]/40 bg-[var(--accent-cobalt)]/5 text-xs font-mono space-y-2"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--accent-cobalt)] font-bold">
                      <span>[DECOY RESPONSE]</span>
                      {msg.action && (
                        <span className="bg-[var(--accent-cobalt)] text-white px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">
                          {msg.action}
                        </span>
                      )}
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>
                    <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* =============================================================== */}
      {/* EXTRACTED IOCS SIDEBAR / TRAY (PRD TI-1, TI-2)                  */}
      {/* =============================================================== */}
      <div className="border-t border-[var(--border-color)] p-6 bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between mb-4">
          <span className="grid-sidebar-label flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            EVIDENCE VAULT: EXTRACTED THREAT INDICATORS ({iocs.length})
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            READY FOR LAW ENFORCEMENT & FRAUD SUBMISSION
          </span>
        </div>

        {iocs.length === 0 ? (
          <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono text-[var(--text-muted)] text-center">
            NO TECHNICAL INDICATORS ISOLATED YET. WAITING FOR ATTACKER TO VOLUNTEER WALLETS, EMAILS, OR PHONES.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {iocs.map((ioc) => (
              <div
                key={ioc.id}
                className="p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono flex items-start justify-between gap-2"
              >
                <div className="overflow-hidden">
                  <span className="text-[10px] uppercase font-bold text-[var(--accent-cobalt)] block">
                    {ioc.type}
                  </span>
                  <span className="font-bold truncate block max-w-[200px]" title={ioc.value}>
                    {ioc.value}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block mt-0.5">
                    Seen {ioc.occurrences}x • {Math.round(ioc.confidence * 100)}% conf
                  </span>
                </div>

                <button
                  onClick={() => handleCopy(ioc.value)}
                  className="p-1 border border-transparent hover:border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  title="Copy indicator value"
                >
                  {copiedIoc === ioc.value ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
  Key,
  User,
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

  // Live stopwatch when incident has active engagement in current session
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
                  <CloudUpload className="w-3.5 h-3.5 text-white shrink-0" />
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
                The visitor or intruder submitted credentials into your decoy login portal. The intercepted credentials and telemetry have been cataloged below.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-amber-500 text-black px-2.5 py-1 font-bold uppercase tracking-wider">
            HONEYPOT TRAP TRIGGERED
          </span>
        </div>
      )}

      {/* =============================================================== */}
      {/* INCIDENT WORKSPACE: LOGIN PORTAL VS CHAT DECOY (PRD DB-3)       */}
      {/* =============================================================== */}
      {trap?.template === "fake_login" ? (
        /* ------------------------------------------------------------- */
        /* MODE A: LOGIN PORTAL LINK HONEYPOT (NO DECOY PERSONA COLUMN)   */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-12 min-h-[660px]">
          {/* MAIN INTERCEPTION STREAM (Cols 1-8) */}
          <div className="col-span-12 lg:col-span-8 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] p-6 flex flex-col justify-between bg-black/[0.01] dark:bg-white/[0.01]">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
                <span className="grid-sidebar-label text-amber-500 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-500" />
                  INTERCEPTED CREDENTIALS & PORTAL TELEMETRY
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  LIVE HONEYPOT STREAM • {messages.filter((m) => m.role === "attacker").length} CAPTURES
                </span>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[560px] pr-2">
                {messages.filter((m) => m.role === "attacker").length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
                    <Lock className="w-8 h-8 text-amber-500/40 mx-auto mb-3" />
                    <p className="font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">
                      Awaiting Intruder Form Submissions
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] max-w-md mx-auto">
                      The honeypot login portal link is active. When a visitor or adversary enters credentials, 2FA codes, or security challenge answers into the target portal, captured inputs will stream live here in real-time.
                    </p>
                    <div className="mt-4">
                      <button
                        onClick={handleSimulate}
                        disabled={simulating}
                        className="poster-btn-secondary poster-btn-sm text-[10px]"
                      >
                        {simulating ? "Simulating..." : "Simulate Intruder Turn"}
                      </button>
                    </div>
                  </div>
                ) : (
                  messages
                    .filter((m) => m.role === "attacker")
                    .map((msg) => {
                      const isCreds =
                        msg.content.includes("[CAPTURED LOGIN CREDENTIALS]") ||
                        msg.content.includes("[Form submission - login]");
                      const isOtp =
                        msg.content.includes("[CAPTURED 2FA / OTP CODE]") ||
                        msg.content.includes("[Form submission - otp]");
                      const isSec =
                        msg.content.includes("[CAPTURED SECURITY CHALLENGE]") ||
                        msg.content.includes("[Form submission - security]");
                      const isTransfer =
                        msg.content.includes("[CAPTURED WIRE TRANSFER") ||
                        msg.content.includes("[Form submission - transfer]");

                      return (
                        <div
                          key={msg.id}
                          className={`p-4 border text-xs font-mono space-y-3 ${
                            isCreds
                              ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                              : isOtp
                              ? "border-blue-500/50 bg-blue-500/10 shadow-sm"
                              : isSec
                              ? "border-purple-500/50 bg-purple-500/10 shadow-sm"
                              : isTransfer
                              ? "border-emerald-500/50 bg-emerald-500/10 shadow-sm"
                              : "border-red-500/30 bg-red-500/5"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span
                              className={`flex items-center gap-1.5 uppercase tracking-wider ${
                                isCreds
                                  ? "text-amber-500 dark:text-amber-400"
                                  : isOtp
                                  ? "text-blue-500 dark:text-blue-400"
                                  : isSec
                                  ? "text-purple-400"
                                  : isTransfer
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }`}
                            >
                              {isCreds ? (
                                <>
                                  <Key className="w-3.5 h-3.5" />
                                  [CAPTURED LOGIN CREDENTIALS]
                                </>
                              ) : isOtp ? (
                                <>
                                  <Shield className="w-3.5 h-3.5" />
                                  [CAPTURED 2FA / OTP CODE]
                                </>
                              ) : isSec ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  [CAPTURED SECURITY CHALLENGE]
                                </>
                              ) : isTransfer ? (
                                <>
                                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                                  [CAPTURED WIRE TRANSFER ATTEMPT]
                                </>
                              ) : (
                                "[INTRUDER PORTAL PAYLOAD]"
                              )}
                            </span>
                            <span className="text-[var(--text-muted)] font-normal">{formatTime(msg.createdAt)}</span>
                          </div>

                          <div className="bg-[var(--bg-primary)] p-3 border border-[var(--border-color)]">
                            <pre className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-mono text-xs">
                              {msg.content}
                            </pre>
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-muted)]">
                            <span>SOURCE IP: {incident.sourceIp} ({incident.geo?.city || "Unknown"}, {incident.geo?.country || "Proxy/VPN"})</span>
                            <button
                              onClick={() => handleCopy(msg.content)}
                              className="hover:text-[var(--text-primary)] flex items-center gap-1"
                              title="Copy payload"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy Payload</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: HONEYPOT TARGET CONFIGURATION & INTRUDER PROFILE (Cols 9-12) */}
          <div className="col-span-12 lg:col-span-4 p-6 flex flex-col justify-between bg-[var(--bg-surface)]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <span className="grid-sidebar-label text-[var(--accent-cobalt)] flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                  HONEYPOT DOSSIER & TARGET
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500 font-bold">
                  <span className="w-2 h-2 bg-emerald-500 rounded-none inline-block animate-pulse" />
                  ARMED & ACTIVE
                </span>
              </div>

              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">TARGET DECOY BRAND:</span>
                  <span className="font-bold text-sm text-[var(--accent-cobalt)] block">
                    {trap?.config.portalBrand || "Secure Banking Portal"}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">PUBLIC HONEYPOT URL:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] truncate text-[var(--text-secondary)]">
                      /t/{trap?.slug}
                    </span>
                    <button
                      onClick={() => handleCopy(`${typeof window !== "undefined" ? window.location.origin : ""}/t/${trap?.slug}`)}
                      className="text-[10px] text-[var(--accent-cobalt)] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">TARGET BALANCE BAIT:</span>
                  <span className="font-bold text-emerald-500">
                    {trap?.config.decoyBalance || "₹85,450.00"}
                  </span>
                </div>

                {trap?.config.securityQuestion && (
                  <div className="pt-2 border-t border-[var(--border-color)]">
                    <span className="text-[10px] uppercase text-[var(--text-muted)] block">TARGET SECURITY QUESTION:</span>
                    <span className="text-[11px] text-[var(--text-secondary)] block">
                      {trap.config.securityQuestion}
                    </span>
                  </div>
                )}
              </div>

              {/* Intruder Telemetry Card */}
              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-2.5 font-mono text-xs">
                <span className="grid-sidebar-label text-red-500 block text-[10px]">
                  INTRUDER DEVICE & NETWORK
                </span>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">IP ADDRESS:</span>
                  <strong className="text-[var(--text-primary)]">{incident.sourceIp}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">GEOLOCATION:</span>
                  <span>{incident.geo?.city || "Unknown"}, {incident.geo?.country || "Proxy/VPN"}</span>
                </div>
                <div className="text-[11px] pt-1 border-t border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block mb-0.5">USER AGENT:</span>
                  <span className="text-[10px] text-[var(--text-secondary)] line-clamp-2" title={incident.userAgent}>
                    {incident.userAgent}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] mt-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">STALL TIME ELAPSED:</span>
                <span className="font-bold text-[var(--accent-cobalt)]">{formatClock(secondsWasted)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MODE B: DECOY PERSONA CHAT (UNIFIED STREAM, NO ISOLATED BOX)  */
        /* ------------------------------------------------------------- */
        <div className="grid grid-cols-12 min-h-[680px]">
          {/* MAIN CHAT CONVERSATION THREAD (Cols 1-8) */}
          <div className="col-span-12 lg:col-span-8 border-b lg:border-b-0 lg:border-r border-[var(--border-color)] p-6 flex flex-col justify-between bg-black/[0.01] dark:bg-white/[0.01]">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
                <span className="grid-sidebar-label text-[var(--accent-cobalt)] flex items-center gap-2">
                  <span className="w-2 h-2 bg-[var(--accent-cobalt)] rounded-none inline-block animate-pulse" />
                  LIVE DECOY PERSONA CONVERSATION: {trap?.config.personaName.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  GULLIBILITY: {trap?.gullibility}% • TURNS: {messages.length}
                </span>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-[580px] pr-2">
                {messages.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)]">
                    DECOY PERSONA STANDING BY... WAITING FOR ADVERSARY CONTACT.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAttacker = msg.role === "attacker";
                    return (
                      <div
                        key={msg.id}
                        className={`p-4 border text-xs font-mono space-y-2 ${
                          isAttacker
                            ? "border-red-500/40 bg-red-500/5 mr-4"
                            : "border-[var(--accent-cobalt)]/40 bg-[var(--accent-cobalt)]/5 ml-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          {isAttacker ? (
                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1.5 uppercase">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-none inline-block" />
                              [ADVERSARY TRANSMISSION • {msg.kind.toUpperCase()}]
                            </span>
                          ) : (
                            <span className="text-[var(--accent-cobalt)] flex items-center gap-1.5 uppercase">
                              <span className="w-1.5 h-1.5 bg-[var(--accent-cobalt)] rounded-none inline-block animate-pulse" />
                              [DECOY: {trap?.config.personaName.toUpperCase()}]
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            {msg.action && (
                              <span className="bg-[var(--accent-cobalt)] text-white px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider">
                                {msg.action}
                              </span>
                            )}
                            <span className="text-[var(--text-muted)] font-normal">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>

                        <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-mono">
                          {msg.content}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: PERSONA & ADVERSARY DOSSIER (Cols 9-12) */}
          <div className="col-span-12 lg:col-span-4 p-6 flex flex-col justify-between bg-[var(--bg-surface)]">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <span className="grid-sidebar-label text-[var(--accent-cobalt)] flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                  DECOY PERSONA DOSSIER
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  ACTIVE ENGAGEMENT
                </span>
              </div>

              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">PERSONA IDENTITY:</span>
                  <span className="font-bold text-sm text-[var(--accent-cobalt)] block">
                    {trap?.config.personaName}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">ARCHETYPE:</span>
                  <span className="font-bold uppercase text-[var(--text-primary)]">
                    {trap?.persona.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">GULLIBILITY INDEX:</span>
                  <span className="font-bold text-amber-500">
                    {trap?.gullibility}% (Delays & Stalls)
                  </span>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <span className="text-[10px] uppercase text-[var(--text-muted)] block">PUBLIC DECOY LINK:</span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-[11px] truncate text-[var(--text-secondary)]">
                      /t/{trap?.slug}
                    </span>
                    <button
                      onClick={() => handleCopy(`${typeof window !== "undefined" ? window.location.origin : ""}/t/${trap?.slug}`)}
                      className="text-[10px] text-[var(--accent-cobalt)] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Adversary Profile */}
              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-2.5 font-mono text-xs">
                <span className="grid-sidebar-label text-red-500 block text-[10px]">
                  TARGET ADVERSARY PROFILE
                </span>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">TARGET IP:</span>
                  <strong className="text-[var(--text-primary)]">{incident.sourceIp}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">GEOLOCATION:</span>
                  <span>{incident.geo?.city || "Unknown"}, {incident.geo?.country || "Proxy/VPN"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-muted)]">TURNS LOGGED:</span>
                  <span className="font-bold">{messages.length}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] mt-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[var(--text-muted)]">ENGAGEMENT TIME:</span>
                <span className="font-bold text-[var(--accent-cobalt)]">{formatClock(secondsWasted)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

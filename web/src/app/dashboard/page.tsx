"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  ShieldAlert,
  Clock,
  Radio,
  Plus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Fingerprint,
} from "lucide-react";
import { formatDuration, timeAgo } from "@/lib/format";
import type { DashboardStats, Incident, LiveEvent, TrapWithStats } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeTraps: 0,
    totalTraps: 0,
    scammersTrapped: 0,
    timeWastedSeconds: 0,
    iocCount: 0,
    activeIncidents: 0,
  });

  const [traps, setTraps] = useState<TrapWithStats[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/incidents");
      if (res.status === 401) {
        window.location.href = "/login?redirect=/dashboard";
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setIncidents(data.incidents || []);
        setTraps(data.traps || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Live SSE stream (PRD DB-2)
    const es = new EventSource("/api/live");

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as LiveEvent;
        if (event.type === "incident.created") {
          setIncidents((prev) => [event.incident, ...prev.filter((i) => i.id !== event.incident.id)]);
          setStats((prev) => ({
            ...prev,
            scammersTrapped: prev.scammersTrapped + 1,
            activeIncidents: prev.activeIncidents + 1,
          }));
        } else if (event.type === "incident.updated") {
          setIncidents((prev) => {
            const updated = prev.map((i) => (i.id === event.incident.id ? event.incident : i));
            const totalWasted = updated.reduce((acc, inc) => acc + (inc.timeWastedSeconds || 0), 0);
            setStats((s) => ({ ...s, timeWastedSeconds: totalWasted }));
            return updated;
          });
        } else if (event.type === "message.created") {
          // Refresh data on new message
          fetchData();
        } else if (event.type === "ioc.upserted") {
          setStats((prev) => ({ ...prev, iocCount: prev.iocCount + 1 }));
        }
      } catch {
        // Heartbeat or parse error
      }
    };

    return () => {
      es.close();
    };
  }, []);

  // Live stopwatch ticking per active session in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setIncidents((prev) => {
        let changed = false;
        const next = prev.map((inc) => {
          if (inc.status === "active") {
            changed = true;
            return {
              ...inc,
              timeWastedSeconds: (inc.timeWastedSeconds || 0) + 1,
            };
          }
          return inc;
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/t/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleToggleTrap = async (trap: TrapWithStats) => {
    const newStatus = trap.status === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/traps/${trap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTraps((prev) => prev.map((t) => (t.id === trap.id ? { ...t, status: newStatus } : t)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTrap = async (id: string) => {
    if (!confirm("Are you sure you want to delete this decoy?")) return;
    try {
      const res = await fetch(`/api/traps/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTraps((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSimulate = async () => {
    if (incidents.length === 0) return;
    setSimulating(true);
    try {
      const targetInc = incidents[0];
      const res = await fetch(`/api/incidents/${targetInc.id}/simulate`, { method: "POST" });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 md:p-8 space-y-8">
        {/* =============================================================== */}
        {/* TOP STATS BAR (Strict 12-Column Grid)                           */}
        {/* =============================================================== */}
        <section className="border border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)]">
            <div className="p-6">
              <span className="grid-sidebar-label block mb-2">ACTIVE DECOYS</span>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold font-mono tracking-tight">
                  {stats.activeTraps}
                </span>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  / {stats.totalTraps} TOTAL
                </span>
              </div>
            </div>

            <div className="p-6">
              <span className="grid-sidebar-label block mb-2">SCAMMERS TRAPPED</span>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold font-mono tracking-tight text-[var(--accent-cobalt)]">
                  {stats.scammersTrapped}
                </span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.activeIncidents} ACTIVE STREAMING
                </span>
              </div>
            </div>

            <div className="p-6">
              <span className="grid-sidebar-label block mb-2">EVIDENCE (IOCS)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-extrabold font-mono tracking-tight">
                  {stats.iocCount}
                </span>
                <Link
                  href="/intel"
                  className="text-xs font-mono text-[var(--accent-cobalt)] hover:underline uppercase font-bold"
                >
                  View Intel →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* CONTROL CLUSTER                                                 */}
        {/* =============================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[var(--text-primary)]" />
            <h1 className="text-2xl font-extrabold uppercase tracking-tight">
              OPERATIONS CONSOLE
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerSimulate}
              disabled={simulating || incidents.length === 0}
              className="poster-btn-secondary poster-btn-sm"
              title="Inject a scripted attacker turn to test the live decoy reply"
            >
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>{simulating ? "Simulating..." : "Simulate Attacker Turn"}</span>
            </button>
            <Link href="/analyze" className="poster-btn-secondary poster-btn-sm">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Analyze Scam</span>
            </Link>
            <Link href="/traps/new" className="poster-btn poster-btn-sm">
              <Plus className="w-3.5 h-3.5" />
              <span>Deploy New Decoy</span>
            </Link>
          </div>
        </div>

        {/* =============================================================== */}
        {/* MAIN SPLIT: DECOYS & LIVE INCIDENT STREAM                       */}
        {/* =============================================================== */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* DECOY TRAPS TABLE (Cols 1-7) */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="grid-sidebar-label">ACTIVE TRAP NETWORK</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {traps.length} DEPLOYED
              </span>
            </div>

            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] divide-y divide-[var(--border-color)]">
              {traps.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                  NO ACTIVE TRAPS DEPLOYED. CLICK "DEPLOY NEW DECOY" TO BEGIN.
                </div>
              ) : (
                traps.map((trap) => (
                  <div key={trap.id} className="p-5 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-none ${
                              trap.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                            }`}
                          />
                          <h3 className="font-extrabold text-base tracking-tight uppercase">
                            {trap.name}
                          </h3>
                        </div>
                        <div className="text-xs font-mono text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>PERSONA: {trap.config.personaName}</span>
                          <span>•</span>
                          <span>PORTAL: {trap.config.portalBrand || "Default"}</span>
                          {trap.config.decoyPassword && (
                            <>
                              <span>•</span>
                              <span className="text-amber-500 font-bold">PRESET PASS: {trap.config.decoyPassword}</span>
                            </>
                          )}
                          {trap.config.decoyUsername && (
                            <>
                              <span>•</span>
                              <span className="text-[var(--accent-cobalt)] font-bold">PRESET USER: {trap.config.decoyUsername}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleTrap(trap)}
                          className="p-1.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] text-xs"
                          title={trap.status === "active" ? "Pause decoy" : "Resume decoy"}
                        >
                          {trap.status === "active" ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteTrap(trap.id)}
                          className="p-1.5 border border-[var(--border-color)] hover:border-red-500 text-xs text-[var(--text-muted)] hover:text-red-500"
                          title="Delete decoy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Decoy credentials testing info */}
                    <div className="p-2.5 bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border-color)] text-[11px] font-mono text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                      <span>
                        🎯 <strong>Honeypot Decoy:</strong> Any username/email & password entered on this target will be captured and streamed live below!
                        {trap.config.decoyPassword ? ` (Or enter preset: ${trap.config.decoyPassword})` : ""}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--border-color)] text-xs font-mono">
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 border border-[var(--border-color)]">
                          /t/{trap.slug}
                        </span>
                        <button
                          onClick={() => handleCopy(trap.slug)}
                          className="text-[var(--accent-cobalt)] hover:underline inline-flex items-center gap-1"
                        >
                          {copiedSlug === trap.slug ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copy Link
                            </>
                          )}
                        </button>
                        <Link
                          href={`/t/${trap.slug}`}
                          target="_blank"
                          className="hover:text-[var(--text-primary)]"
                          title="Open public decoy"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="text-[var(--text-muted)] text-[11px] font-mono">
                        {trap.incidentCount} incidents •{" "}
                        <span className="text-[var(--text-secondary)] font-bold">
                          {formatDuration(
                            incidents
                              .filter((i) => i.trapId === trap.id)
                              .reduce((sum, i) => sum + (i.timeWastedSeconds || 0), 0) || trap.timeWastedSeconds
                          )}{" "}
                          wasted
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LIVE INCIDENT STREAM (Cols 8-12) */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="grid-sidebar-label flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-none animate-ping" />
                LIVE INCIDENT STREAM
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                REALTIME SSE
              </span>
            </div>

            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] divide-y divide-[var(--border-color)] max-h-[600px] overflow-y-auto">
              {incidents.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[var(--text-muted)]">
                  WAITING FOR FIRST ADVERSARY ENGAGEMENT...
                </div>
              ) : (
                incidents.map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/incidents/${inc.id}`}
                    className="p-5 block hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                            inc.threatLevel === "High"
                              ? "threat-high"
                              : inc.threatLevel === "Medium"
                              ? "threat-medium"
                              : "threat-low"
                          }`}
                        >
                          {inc.threatLevel || "HIGH"}
                        </span>
                        <span className="font-extrabold text-sm uppercase tracking-tight group-hover:text-[var(--accent-cobalt)] transition-colors">
                          {inc.scamType || "Incoming Interaction"}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {timeAgo(inc.lastActivityAt)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                      {inc.summary || "Active attacker engagement in progress."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-[var(--border-color)] text-[var(--text-muted)]">
                      <span>IP: {inc.sourceIp}</span>
                      <div className="flex items-center gap-1.5 font-bold">
                        {inc.status === "active" ? (
                          <span className="flex items-center gap-1.5 text-emerald-500 font-mono">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none animate-pulse" />
                            <Clock className="w-3 h-3 text-emerald-500 animate-spin" style={{ animationDuration: "6s" }} />
                            <span>{formatDuration(inc.timeWastedSeconds)} WASTED</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[var(--text-muted)] font-mono">
                            <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>{formatDuration(inc.timeWastedSeconds)} WASTED</span>
                          </span>
                        )}
                        <ArrowUpRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-cobalt)] transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

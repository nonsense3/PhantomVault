"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  User,
  Shield,
  Key,
  Copy,
  Check,
  ArrowRight,
  LogOut,
  Calendar,
  Lock,
  Radio,
  Clock,
  Fingerprint,
  Save,
  CheckCircle2,
} from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, incRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/incidents"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (!meData?.user) {
            router.push("/login");
            return;
          }
          setUser(meData.user);
          setDisplayName(meData.user.displayName || "");
        } else {
          router.push("/login");
          return;
        }

        if (incRes.ok) {
          const incData = await incRes.json();
          if (incData?.stats) {
            setStats(incData.stats);
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setError(null);
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setUser(data.user);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
            <span className="w-2 h-2 bg-[var(--accent-cobalt)] animate-ping" />
            <span>AUTHENTICATING OPERATOR IDENTITY...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active Operator";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-[var(--border-color)] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-[var(--accent-cobalt)]" />
              <span className="grid-sidebar-label">OPERATOR CREDENTIALS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
              OPERATOR PROFILE
            </h1>
            <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">
              IDENTITY SPECIFICATION, ACTIVE SESSION PARAMETERS, AND LIFETIME TELEMETRY
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="poster-btn-secondary poster-btn-sm">
              <span>Operations Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Left Column: Operator Badge Card (Cols 1-4) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-6">
              {/* Avatar & Display name */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 border-2 border-[var(--accent-cobalt)] bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-[var(--accent-cobalt)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-none animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      VERIFIED OPERATOR
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold uppercase tracking-tight truncate mt-1">
                    {user.displayName}
                  </h2>
                  <p className="text-xs font-mono text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Account Metadata */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-3 text-xs font-mono">
                <div>
                  <span className="grid-sidebar-label block mb-1">OPERATOR UUID</span>
                  <div className="flex items-center justify-between gap-2 p-2 border border-[var(--border-color)] bg-[var(--bg-primary)]">
                    <span className="truncate text-[11px] text-[var(--text-secondary)]">
                      {user.id}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-[var(--accent-cobalt)] hover:underline flex-shrink-0 text-[11px] font-bold inline-flex items-center gap-1"
                      title="Copy User ID"
                    >
                      {copiedId ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                  <span>REGISTERED SINCE</span>
                  <span className="font-bold text-[var(--text-primary)]">{joinDate}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                  <span>SECURITY CONFINEMENT</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">STRICT RLS</span>
                </div>

                <div className="flex items-center justify-between py-1 text-[var(--text-secondary)]">
                  <span>HONEYTOKEN GENERATOR</span>
                  <span className="font-bold text-[var(--text-primary)]">SYNTHETIC V2</span>
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-3 border border-red-500/40 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-colors rounded-none"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>TERMINATE SESSION (SIGN OUT)</span>
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 space-y-3">
              <span className="grid-sidebar-label block">QUICK NAVIGATION</span>
              <div className="space-y-2 text-xs font-mono">
                <Link
                  href="/traps/new"
                  className="p-2.5 border border-[var(--border-color)] hover:border-[var(--accent-cobalt)] block font-bold transition-colors"
                >
                  + DEPLOY NEW DECOY HONEYPOT →
                </Link>
                <Link
                  href="/analyze"
                  className="p-2.5 border border-[var(--border-color)] hover:border-[var(--accent-cobalt)] block font-bold transition-colors"
                >
                  ⚡ ANALYZE SUSPICIOUS COMMUNICATION →
                </Link>
                <Link
                  href="/intel"
                  className="p-2.5 border border-[var(--border-color)] hover:border-[var(--accent-cobalt)] block font-bold transition-colors"
                >
                  🛡️ VIEW FORENSIC IOC EVIDENCE →
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Telemetry (Cols 5-12) */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Identity Settings Card */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <span className="grid-sidebar-label block mb-2">OPERATOR PARAMETERS</span>
                <h3 className="text-xl font-extrabold uppercase tracking-tight">
                  IDENTITY SPECIFICATION
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Customize the operator handle displayed on incident exports, forensic evidence dossiers, and live monitoring dashboards.
                </p>
              </div>

              {error && (
                <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
                  ERROR: {error}
                </div>
              )}

              {saveSuccess && (
                <div className="p-4 border border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OPERATOR SPECIFICATION UPDATED SUCCESSFULLY.</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label
                    htmlFor="operator-name"
                    className="grid-sidebar-label block mb-2"
                  >
                    OPERATOR / DISPLAY NAME
                  </label>
                  <input
                    id="operator-name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Security Lead"
                    className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="operator-email"
                    className="grid-sidebar-label block mb-2"
                  >
                    PRIMARY EMAIL IDENTIFIER
                  </label>
                  <input
                    id="operator-email"
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-primary)]/50 text-sm font-mono text-[var(--text-muted)] cursor-not-allowed rounded-none"
                  />
                  <span className="text-[11px] font-mono text-[var(--text-muted)] block mt-1.5">
                    Managed via authenticated identity provider (Supabase / Google / GitHub).
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving || !displayName.trim()}
                    className="poster-btn poster-btn-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving Changes..." : "Save Identity Changes"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Lifetime Telemetry Metrics */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div>
                <span className="grid-sidebar-label block mb-2">ENGAGEMENT FORENSICS</span>
                <h3 className="text-xl font-extrabold uppercase tracking-tight">
                  LIFETIME TELEMETRY METRICS
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Cumulative impact statistics generated across all honeypots deployed by this operator account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-5 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1">
                  <span className="grid-sidebar-label block">ACTIVE HONEYPOTS</span>
                  <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                    {stats?.activeTraps ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                    OF {stats?.totalTraps ?? 0} DEPLOYED
                  </span>
                </div>

                <div className="p-5 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1">
                  <span className="grid-sidebar-label block">SCAMMERS TRAPPED</span>
                  <div className="text-3xl font-extrabold font-mono text-[var(--accent-cobalt)]">
                    {stats?.scammersTrapped ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                    {stats?.activeIncidents ?? 0} LIVE STREAMING
                  </span>
                </div>

                <div className="p-5 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1">
                  <span className="grid-sidebar-label block">ADVERSARY DELAY</span>
                  <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                    {formatDuration(stats?.timeWastedSeconds ?? 0)}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                    TOTAL WASTED TIME
                  </span>
                </div>

                <div className="p-5 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1">
                  <span className="grid-sidebar-label block">EXTRACTED IOCS</span>
                  <div className="text-3xl font-extrabold font-mono text-[var(--text-primary)]">
                    {stats?.iocCount ?? 0}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--accent-cobalt)] font-bold block">
                    FORENSIC EVIDENCE
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Policies & Confinement Architecture */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-4">
              <span className="grid-sidebar-label block">SECURITY PROTOCOLS</span>
              <h3 className="text-xl font-extrabold uppercase tracking-tight">
                ACTIVE PROTECTION POLICIES
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-mono">
                <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <Shield className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                    <span>Row Level Security (RLS)</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    PostgreSQL security policies guarantee zero cross-tenant contamination. Only your account session can access your transcripts and IoCs.
                  </p>
                </div>

                <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Synthetic Honeytokens</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Credentials, bank cards, and verification codes emitted during scam baiting turns are mathematically non-functional tokens.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

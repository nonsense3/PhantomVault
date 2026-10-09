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
  Download,
  ExternalLink,
  CloudUpload,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { DashboardStats, Incident } from "@/lib/types";

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

interface VaultedReportItem {
  id: string;
  reportId: string;
  incidentId: string;
  vaultedAt: string;
  scamType: string;
  threatLevel: string;
  summary: string;
  sourceIp: string;
  geo?: any;
  timeWastedSeconds: number;
  turns: number;
  trapName: string;
  evidencePackage?: any;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vaultedReports, setVaultedReports] = useState<VaultedReportItem[]>([]);
  const [expandedDossierId, setExpandedDossierId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "vaulted">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Account Decommissioning state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
          if (incData?.incidents) {
            setIncidents(incData.incidents);
          }
          if (incData?.vaultedReports) {
            setVaultedReports(incData.vaultedReports);
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
      window.dispatchEvent(
        new CustomEvent("profile-updated", { detail: data.user })
      );
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmationInput.trim().toUpperCase() !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm account deletion.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to decommission operator account");
      }

      window.dispatchEvent(new CustomEvent("profile-updated", { detail: null }));
      router.push("/login?message=account_deleted");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Account deletion failed");
      setDeleting(false);
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

              {/* Session Termination & Decommission Buttons */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full p-2.5 border border-[var(--border-color)] hover:border-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-colors rounded-none"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>TERMINATE SESSION</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationInput("");
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}
                  className="w-full p-2.5 border border-red-500/40 hover:border-red-500 bg-red-500/5 hover:bg-red-500/15 text-red-500 text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-colors rounded-none"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE OPERATOR ACCOUNT</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
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

                <div className="p-5 border border-emerald-500/40 bg-emerald-500/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="grid-sidebar-label text-emerald-600 dark:text-emerald-400 block">CLOUD VAULT</span>
                    <CloudUpload className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {vaultedReports.length}
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block">
                    SUPABASE ARCHIVED
                  </span>
                </div>
              </div>
            </div>

            {/* Cloud Vault Evidence Repository (Supabase Sync) */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CloudUpload className="w-4 h-4 text-[var(--accent-cobalt)]" />
                    <span className="grid-sidebar-label">SUPABASE CLOUD VAULT REPOSITORY</span>
                  </div>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight">
                    CLOUD-VAULTED ATTACK EVIDENCE DOSSIERS ({vaultedReports.length})
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Cryptographically sealed forensic incident dossiers uploaded and archived to Supabase PostgreSQL cloud storage with Row Level Security.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    RLS SECURED
                  </span>
                </div>
              </div>

              {vaultedReports.length === 0 ? (
                <div className="p-8 border border-[var(--border-color)] bg-[var(--bg-primary)] text-center space-y-3 font-mono text-xs text-[var(--text-muted)]">
                  <CloudUpload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-[var(--text-primary)]">NO EVIDENCE PACKAGES VAULTED TO SUPABASE YET.</p>
                  <p className="text-[11px] text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
                    When inspecting an incident in the Operations Console, click <strong className="text-[var(--text-primary)]">&quot;Vault to Cloud (Supabase)&quot;</strong> to upload and synchronize a permanent, tamper-proof forensic evidence package to your private cloud storage.
                  </p>
                  <Link href="/dashboard" className="poster-btn poster-btn-sm inline-flex mt-2">
                    View Live Operations Console →
                  </Link>
                </div>
              ) : (
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] divide-y divide-[var(--border-color)]">
                  {vaultedReports.map((report) => (
                    <div key={report.id || report.reportId} className="p-5 space-y-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-[var(--accent-cobalt)]/10 text-[var(--accent-cobalt)] border border-[var(--accent-cobalt)]/30 px-2 py-0.5">
                              {report.reportId}
                            </span>
                            <span className="font-extrabold text-sm uppercase tracking-tight">
                              {report.scamType} — {report.trapName}
                            </span>
                            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              STORED IN SUPABASE
                            </span>
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] font-mono max-w-2xl line-clamp-1">
                            {report.summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[var(--text-muted)] pt-0.5">
                            <span>TARGET IP: <strong className="text-[var(--text-primary)]">{report.sourceIp}</strong></span>
                            <span>•</span>
                            <span>GEO: {report.geo?.city || "Unknown"}, {report.geo?.country || "Proxy/VPN"}</span>
                            <span>•</span>
                            <span>TIME WASTED: <strong className="text-[var(--accent-cobalt)]">{formatDuration(report.timeWastedSeconds)}</strong></span>
                            <span>•</span>
                            <span>TURNS: {report.turns}</span>
                            <span>•</span>
                            <span>VAULTED: {new Date(report.vaultedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {report.evidencePackage && (
                            <button
                              type="button"
                              onClick={() => setExpandedDossierId(expandedDossierId === report.id ? null : report.id)}
                              className="p-2 border border-[var(--border-color)] hover:border-[var(--border-strong)] text-xs font-mono flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              title="Toggle raw evidence JSON preview"
                            >
                              <span>{expandedDossierId === report.id ? "Hide Dossier" : "View Dossier"}</span>
                            </button>
                          )}
                          {report.incidentId && (
                            <a
                              href={`/api/incidents/${report.incidentId}/export`}
                              download
                              className="p-2 border border-[var(--border-color)] hover:border-[var(--border-strong)] text-xs font-mono flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              title="Download complete JSON evidence dossier"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">JSON</span>
                            </a>
                          )}
                          {report.incidentId && (
                            <Link
                              href={`/incidents/${report.incidentId}`}
                              className="poster-btn poster-btn-sm"
                            >
                              <span>Inspect →</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Expanded Raw Dossier Viewer */}
                      {expandedDossierId === report.id && report.evidencePackage && (
                        <div className="mt-3 p-4 border border-[var(--border-color)] bg-black/90 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-72">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-900/50 text-[10px] text-emerald-500 uppercase">
                            <span>AUTHENTICATED SUPABASE CLOUD DOSSIER // {report.reportId}</span>
                            <span>VERSION: {report.evidencePackage.version || "1.0"}</span>
                          </div>
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(report.evidencePackage, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attack & Incident Forensic History (PRD TI & Profile) */}
            <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
                <div>
                  <span className="grid-sidebar-label block mb-1">EVIDENCE AUDIT LOG</span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight">
                    ATTACK & INCIDENT FORENSIC HISTORY ({incidents.length})
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Historical adversary interactions, intercepted authentication credentials, and cloud-vaulted evidence packages.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("all")}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors ${
                      historyFilter === "all"
                        ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)] text-white"
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    ALL ({incidents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilter("vaulted")}
                    className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors ${
                      historyFilter === "vaulted"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    VAULTED ({incidents.filter((i) => i.summary?.includes("[VAULTED TO CLOUD")).length})
                  </button>
                  <Link href="/dashboard" className="poster-btn poster-btn-sm ml-2">
                    <span>Live Dashboard →</span>
                  </Link>
                </div>
              </div>

              {incidents.length === 0 ? (
                <div className="p-8 border border-[var(--border-color)] bg-[var(--bg-primary)] text-center space-y-3 font-mono text-xs text-[var(--text-muted)]">
                  <Fingerprint className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-[var(--text-primary)]">NO ATTACKS OR INCIDENTS RECORDED YET.</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Deploy a digital honeypot target and share the link with scammers or intruders to capture threat intelligence.
                  </p>
                  <Link href="/traps/new" className="poster-btn poster-btn-sm inline-flex mt-2">
                    Deploy New Decoy Now
                  </Link>
                </div>
              ) : (
                <div className="border border-[var(--border-color)] bg-[var(--bg-primary)] divide-y divide-[var(--border-color)]">
                  {(historyFilter === "vaulted"
                    ? incidents.filter((i) => i.summary?.includes("[VAULTED TO CLOUD"))
                    : incidents
                  ).map((inc) => {
                    const isVaulted = inc.summary?.includes("[VAULTED TO CLOUD");
                    return (
                      <div
                        key={inc.id}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                                inc.threatLevel === "High"
                                  ? "threat-high"
                                  : inc.threatLevel === "Medium"
                                  ? "threat-medium"
                                  : "threat-low"
                              }`}
                            >
                              {inc.threatLevel || "HIGH"} THREAT
                            </span>
                            <span className="font-extrabold text-sm uppercase tracking-tight">
                              {inc.scamType || "Incoming Interaction"}
                            </span>
                            {isVaulted && (
                              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                VAULTED TO SUPABASE CLOUD
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[var(--text-secondary)] font-mono max-w-2xl line-clamp-1">
                            {inc.summary || "Active adversary interaction recorded."}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[var(--text-muted)]">
                            <span>
                              TARGET IP: <strong className="text-[var(--text-primary)]">{inc.sourceIp}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              TIME WASTED: <strong className="text-[var(--accent-cobalt)]">{formatDuration(inc.timeWastedSeconds)}</strong>
                            </span>
                            <span>•</span>
                            <span>LAST SEEN: {new Date(inc.lastActivityAt).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`/api/incidents/${inc.id}/export`}
                            download
                            className="p-2 border border-[var(--border-color)] hover:border-[var(--border-strong)] text-xs font-mono flex items-center gap-1.5 hover:text-[var(--text-primary)] text-[var(--text-secondary)]"
                            title="Download complete JSON evidence dossier"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">JSON</span>
                          </a>
                          <Link
                            href={`/incidents/${inc.id}`}
                            className="poster-btn poster-btn-sm"
                          >
                            <span>Inspect Transmissions →</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

            {/* Danger Zone: Account Decommissioning */}
            <div className="border border-red-500/40 bg-red-500/5 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-500">
                  DANGER ZONE / IRREVERSIBLE
                </span>
              </div>
              <h3 className="text-xl font-extrabold uppercase tracking-tight text-red-500">
                DECOMMISSION & PURGE OPERATOR ACCOUNT
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                Permanently erase operator identity, active decoy traps, adversary chat transcripts, and extracted IoC records from the mesh database. This action cannot be undone.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationInput("");
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}
                  className="p-3 border border-red-500 bg-red-500 text-white hover:bg-red-600 text-xs font-mono uppercase font-bold tracking-wider flex items-center gap-2 transition-colors rounded-none"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>PURGE OPERATOR ACCOUNT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-red-500 max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 border border-red-500 bg-red-500/10">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest block text-red-400">
                    CONFIRMATION REQUIRED
                  </span>
                  <h2 className="text-lg font-extrabold uppercase tracking-tight text-[var(--text-primary)]">
                    DECOMMISSION OPERATOR ACCOUNT
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-secondary)] font-mono leading-relaxed bg-red-500/5 border border-red-500/20 p-4">
              <p className="font-bold text-red-500">
                [!] WARNING: THIS ACTION IS PERMANENT AND CANNOT BE REVERSED.
              </p>
              <p>
                Target Operator: <strong>{user.email}</strong> ({user.id})
              </p>
              <p>
                Executing this will permanently purge all deployed honeypots, intercepted attacker messages, and forensic telemetry dossiers.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
                ERROR: {deleteError}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="delete-confirm"
                className="text-xs font-mono uppercase tracking-wider block text-[var(--text-muted)]"
              >
                Type <span className="text-red-500 font-bold">DELETE</span> to confirm decommissioning:
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono focus:outline-none focus:border-red-500 rounded-none uppercase"
                autoFocus
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="poster-btn-secondary poster-btn-sm"
              >
                <span>Cancel</span>
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirmationInput.trim().toUpperCase() !== "DELETE"}
                onClick={handleDeleteAccount}
                className="p-3 border border-red-500 bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-500 text-xs font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-colors rounded-none"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? "Decommissioning..." : "Permanently Purge Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

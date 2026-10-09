"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { KeyRound, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setAuthenticated(true);
          }
        }
      } catch {
        // Ignored
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Navbar />
        <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-[var(--text-muted)]">
            <span className="w-2 h-2 bg-[var(--accent-cobalt)] animate-ping" />
            <span>VERIFYING RECOVERY SESSION...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-12 border-b border-[var(--border-color)]">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4 text-[var(--accent-cobalt)]" />
              <span className="grid-sidebar-label">SECURITY RECOVERY</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mt-4">
              NEW PASSWORD
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">
              Define a new cryptographic password for your operator identity. Upon saving, previous sessions remain secured.
            </p>
          </div>

          <div className="pt-8 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>CRYPTOGRAPHIC RE-KEYING</span>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed">
              Password changes are verified directly by Supabase Auth with bcrypt hashing.
            </p>
          </div>
        </div>

        {/* Form area */}
        <div className="col-span-12 md:col-span-8 p-8 md:p-16 flex flex-col justify-center max-w-xl">
          {!authenticated ? (
            <div className="p-8 border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-4">
              <div className="text-red-500 font-mono text-xs font-bold uppercase tracking-wider">
                [!] RECOVERY SESSION INVALID OR EXPIRED
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
                Your recovery token has expired, is invalid, or has already been used. Please request a new recovery link from the login portal.
              </p>
              <div className="pt-2">
                <Link href="/login" className="poster-btn poster-btn-sm">
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="p-8 border border-emerald-500 bg-emerald-500/10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-sm font-bold uppercase">
                <CheckCircle2 className="w-5 h-5" />
                <span>OPERATOR PASSWORD RE-KEYED SUCCESSFULLY</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                Your new password has been applied. You may now access all operations dashboards.
              </p>
              <div className="pt-4">
                <Link href="/dashboard" className="poster-btn">
                  <span>Access Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
                  ERROR: {error}
                </div>
              )}

              <div>
                <label className="grid-sidebar-label block mb-2" htmlFor="new-password">
                  NEW OPERATOR PASSWORD
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                />
              </div>

              <div>
                <label className="grid-sidebar-label block mb-2" htmlFor="confirm-password">
                  CONFIRM NEW PASSWORD
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="poster-btn w-full sm:w-auto"
                >
                  {loading ? "Re-keying Password..." : "Update Password & Proceed"}{" "}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

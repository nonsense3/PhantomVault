"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowRight, UserPlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase-client";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setError(null);
    setOauthLoading(provider);

    try {
      if (!supabase) {
        throw new Error("Authentication service is currently unavailable");
      }

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to sign up with ${provider}`);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-12 border-b border-[var(--border-color)]">
        {/* Sidebar */}
        <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 md:p-12 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-[var(--accent-cobalt)]" />
              <span className="grid-sidebar-label">IDENTITY CREATION</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mt-4">
              CREATE OPERATOR ACCOUNT
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">
              Create your private workspace to deploy customized honeypots, inspect live scammer telemetry, and download IoC reports.
            </p>
          </div>

          <div className="pt-8 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>PASSIVE TELEMETRY SANDBOX</span>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)] leading-relaxed">
              Decoy persona assets are safely synthetic. Zero exposure of personal credentials or accounts.
            </p>
          </div>
        </div>

        {/* Form area */}
        <div className="col-span-12 md:col-span-8 p-8 md:p-16 flex flex-col justify-center max-w-xl">
          {error && (
            <div className="mb-6 p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              disabled={oauthLoading !== null || loading}
              onClick={() => handleOAuth("google")}
              className="w-full p-3.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors rounded-none disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{oauthLoading === "google" ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>

            <button
              type="button"
              disabled={oauthLoading !== null || loading}
              onClick={() => handleOAuth("github")}
              className="w-full p-3.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] bg-[var(--bg-surface)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors rounded-none disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>{oauthLoading === "github" ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
            </button>
          </div>

          <div className="relative mb-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-color)]" />
            </div>
            <span className="relative bg-[var(--bg-primary)] px-3 text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              OR REGISTER WITH EMAIL
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="grid-sidebar-label block mb-2" htmlFor="name">
                OPERATOR / DISPLAY NAME
              </label>
              <input
                id="name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
              />
            </div>

            <div>
              <label className="grid-sidebar-label block mb-2" htmlFor="email">
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@domain.com"
                className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
              />
            </div>

            <div>
              <label className="grid-sidebar-label block mb-2" htmlFor="password">
                PASSWORD (MIN 6 CHARACTERS)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
              />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="poster-btn w-full sm:w-auto"
              >
                {loading ? "Creating..." : "Create Account"} <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/login"
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center py-2"
              >
                Already registered? Sign In →
              </Link>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

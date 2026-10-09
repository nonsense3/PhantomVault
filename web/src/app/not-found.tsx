import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-mono">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full border border-[var(--border-strong)] bg-[var(--bg-surface)] p-8 text-center space-y-6 shadow-none">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-black text-white border border-[var(--border-strong)]">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">
              ERROR 404 // ROUTE NOT FOUND
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--text-primary)]">
              Decoy Vector Non-Existent
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              The targeted endpoint or asset cannot be located on this honeypot network. It may have expired or been deactivated.
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-center gap-4">
            <Link
              href="/"
              className="poster-btn poster-btn-sm inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="poster-btn poster-btn-sm border border-[var(--border-strong)] bg-black text-white hover:bg-zinc-800"
            >
              Console
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

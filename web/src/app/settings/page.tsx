"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Settings, Shield, HardDrive, Database, Info } from "lucide-react";

export default function SettingsPage() {
  const [retentionDays, setRetentionDays] = useState(30);
  const [saved, setSaved] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 md:p-8 space-y-8">
        <div className="border-b border-[var(--border-color)] pb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[var(--accent-cobalt)]" />
            <h1 className="text-2xl font-extrabold uppercase tracking-tight">
              SYSTEM SETTINGS & POLICIES
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
            RETENTION THRESHOLDS, ETHICAL SAFEGUARDS, AND MODEL SPECIFICATIONS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Data retention & ethics */}
          <div className="md:col-span-8 space-y-6">
            {/* Retention Card */}
            <div className="p-6 border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-4">
              <span className="grid-sidebar-label block">DATA MINIMIZATION PROTOCOL</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                PhantomVault enforces automated data purging for adversary transcripts and session cookies to prevent indefinite retention of unverified attacker inputs.
              </p>

              <div>
                <label className="text-xs font-mono font-bold uppercase block mb-2">
                  Transcript Retention Window (Days): {retentionDays}
                </label>
                <input
                  type="range"
                  min={7}
                  max={90}
                  value={retentionDays}
                  onChange={(e) => {
                    setRetentionDays(Number(e.target.value));
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                  }}
                  className="w-full h-2 bg-[var(--border-color)] appearance-none cursor-pointer accent-[var(--accent-cobalt)]"
                />
              </div>

              {saved && (
                <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  ✓ Retention preferences updated.
                </div>
              )}
            </div>

            {/* Ethics & Safety Card */}
            <div className="p-6 border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
              <span className="grid-sidebar-label block">ETHICAL CONFINEMENT RULES</span>
              <ul className="text-xs space-y-2 text-[var(--text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-cobalt)] font-bold font-mono">•</span>
                  <span><strong>Zero Counter-Offensive:</strong> No network port scans, denial of service, or payload delivery back to the attacker.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-cobalt)] font-bold font-mono">•</span>
                  <span><strong>No Brand Impersonation:</strong> All portals utilize generic fictional corporate brand identities (e.g. Northwind Secure Bank).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--accent-cobalt)] font-bold font-mono">•</span>
                  <span><strong>Mathematical Invalidation:</strong> All credentials, card numbers, or vouchers emitted by the persona are non-functional test numbers that fail payment processor validation.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: About Section & Powered By Badge (PRD 9.1 Rule 5) */}
          <div className="md:col-span-4 p-6 border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-4">
            <span className="grid-sidebar-label block">ABOUT PHANTOMVAULT</span>
            <div className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                PhantomVault is an autonomous digital decoy and forensic intelligence network designed to invert the economics of mass-scale cyber fraud.
              </p>
              <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-primary)] text-center">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block">
                  INTELLIGENCE RUNTIME
                </span>
                {/* Permitted model name badge as defined in PRD 9.1 Rule 5 */}
                <span className="text-sm font-bold text-[var(--accent-cobalt)] tracking-wider mt-1 block">
                  Powered by Gemma 4
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-1">
                  Multimodal Vision & Function Calling Core
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

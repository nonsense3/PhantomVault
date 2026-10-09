import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="w-full border-t border-[var(--border-color)] bg-[var(--bg-primary)] mt-auto">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 px-6 py-12 gap-8">
        {/* Cols 1-3: Brand & Copyright */}
        <div className="col-span-12 md:col-span-3 flex flex-col justify-between space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-[var(--border-strong)] bg-black overflow-hidden flex-shrink-0">
              <Image
                src="/logo.png"
                alt="PhantomVault Logo"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-extrabold text-base tracking-tight uppercase">
              PHANTOM<span className="text-[var(--accent-cobalt)]">VAULT</span>
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-normal leading-relaxed max-w-[280px]">
            Digital decoy and active threat intelligence platform. Turn scam interactions into actionable forensic evidence.
          </p>
          <div className="text-[11px] font-mono text-[var(--text-muted)]">
            © {new Date().getFullYear()} PhantomVault. Reality-First Security.
          </div>
        </div>

        {/* Cols 4-6: Navigation */}
        <div className="col-span-6 md:col-span-3 space-y-3">
          <span className="grid-sidebar-label block mb-4">SYSTEM INDEX</span>
          <ul className="space-y-2 text-xs font-semibold uppercase tracking-wider">
            <li>
              <Link href="/dashboard" className="hover:text-[var(--accent-cobalt)] transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/analyze" className="hover:text-[var(--accent-cobalt)] transition-colors">
                Scam Analyzer
              </Link>
            </li>
            <li>
              <Link href="/intel" className="hover:text-[var(--accent-cobalt)] transition-colors">
                Threat Intelligence
              </Link>
            </li>
            <li>
              <Link href="/settings" className="hover:text-[var(--accent-cobalt)] transition-colors">
                System Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* Cols 7-9: Protocols & Ethics */}
        <div className="col-span-6 md:col-span-3 space-y-3">
          <span className="grid-sidebar-label block mb-4">SECURITY PROTOCOLS</span>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Passive observation only. All persona credentials and financial data emitted are provably invalid test tokens. Zero offensive retaliation.
          </p>
          <div className="pt-2">
            <Link
              href="/t/northwind-verify"
              className="text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-cobalt)] underline underline-offset-4"
            >
              Inspect Public Decoy Demo →
            </Link>
          </div>
        </div>

        {/* Cols 10-12: Designated Powered By Badge (PRD 9.1 Rule 5) */}
        <div className="col-span-12 md:col-span-3 flex flex-col justify-between items-start md:items-end space-y-4">
          <span className="grid-sidebar-label block">ENGINE SPECIFICATION</span>
          <div className="p-3 border border-[var(--border-color)] bg-[var(--bg-surface)] text-right">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
              INTELLIGENCE CORE
            </div>
            {/* Permitted model name badge as defined in PRD 9.1 Rule 5 */}
            <div className="text-xs font-bold text-[var(--accent-cobalt)] tracking-wider mt-0.5">
              Powered by Gemma 4
            </div>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-muted)]">
            STRICT ZERO-RADIUS POSTER MODERNIST DESIGN
          </div>
        </div>
      </div>
    </footer>
  );
}

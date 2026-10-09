"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Shield, Search, Download, Copy, Check, Filter } from "lucide-react";
import { IOC_LABELS } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";
import type { Ioc, IocType } from "@/lib/types";

export default function IntelPage() {
  const [iocs, setIocs] = useState<Ioc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchIocs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (search) params.set("q", search);

      const res = await fetch(`/api/iocs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIocs(data.iocs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIocs();
  }, [filterType, search]);

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(iocs, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phantomvault-threat-intelligence-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const types: { key: string; label: string }[] = [
    { key: "all", label: "ALL INDICATORS" },
    { key: "wallet", label: "CRYPTO WALLETS" },
    { key: "email", label: "EMAILS" },
    { key: "domain", label: "DOMAINS" },
    { key: "url", label: "LINKS" },
    { key: "ip", label: "IP ADDRESSES" },
    { key: "bank", label: "BANK ACCOUNTS" },
    { key: "phone", label: "PHONE NUMBERS" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[var(--accent-cobalt)]" />
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight">
                THREAT INTELLIGENCE VAULT
              </h1>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                PASSIVELY HARVESTED FORENSIC INDICATORS OF COMPROMISE (IOCS)
              </p>
            </div>
          </div>

          <button
            onClick={handleExportJson}
            disabled={iocs.length === 0}
            className="poster-btn poster-btn-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Intel (JSON)</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key)}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border rounded-none transition-colors ${
                  filterType === t.key
                    ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)] text-white"
                    : "border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address, domain, or IP..."
              className="w-full pl-9 pr-4 py-2 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
            />
          </div>
        </div>

        {/* IoC Table */}
        <div className="border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-black/5 dark:bg-white/5 uppercase text-[10px] tracking-wider text-[var(--text-muted)]">
                <th className="p-4">TYPE</th>
                <th className="p-4">INDICATOR VALUE</th>
                <th className="p-4">CONFIDENCE</th>
                <th className="p-4">OCCURRENCES</th>
                <th className="p-4">FIRST SEEN</th>
                <th className="p-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    LOADING EVIDENCE RECORDS...
                  </td>
                </tr>
              ) : iocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[var(--text-muted)]">
                    NO INDICATORS MATCH THE SELECTED CRITERIA.
                  </td>
                </tr>
              ) : (
                iocs.map((ioc) => (
                  <tr key={ioc.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="p-4">
                      <span className="px-2 py-0.5 border border-[var(--border-color)] bg-[var(--bg-primary)] font-bold text-[var(--accent-cobalt)] uppercase text-[10px]">
                        {ioc.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[var(--text-primary)] max-w-xs sm:max-w-md truncate" title={ioc.value}>
                      {ioc.value}
                    </td>
                    <td className="p-4">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {Math.round(ioc.confidence * 100)}%
                      </span>
                    </td>
                    <td className="p-4 font-bold">{ioc.occurrences}x</td>
                    <td className="p-4 text-[var(--text-muted)]">{formatDateTime(ioc.firstSeen)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleCopy(ioc.id, ioc.value)}
                        className="p-1.5 border border-[var(--border-color)] hover:border-[var(--border-strong)] transition-colors"
                        title="Copy indicator value"
                      >
                        {copiedId === ioc.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Footer />
    </div>
  );
}

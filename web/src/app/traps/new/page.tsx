"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PERSONAS, TEMPLATES, gullibilityLabel, gullibilityParams, personaById } from "@/lib/catalog";
import type { PersonaId, TemplateId } from "@/lib/types";
import {
  ArrowRight,
  Sliders,
  CheckCircle,
  Shield,
  User,
  Globe,
  Lock,
  Building2,
  Key,
  Info,
  DollarSign,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

function CreateTrapForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Basic Info
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateId>("forward_scam");
  const [persona, setPersona] = useState<PersonaId>("gullible_senior");
  const [personaName, setPersonaName] = useState("");
  const [gullibility, setGullibility] = useState(75);
  const [opener, setOpener] = useState("");
  const [scamType, setScamType] = useState("");
  const [sourceAnalysisId, setSourceAnalysisId] = useState("");

  // Manual Custom Data / Target Parameters
  const [portalBrand, setPortalBrand] = useState("Northwind Secure Bank");
  const [decoyUsername, setDecoyUsername] = useState("");
  const [decoyPassword, setDecoyPassword] = useState("");
  const [decoyBalance, setDecoyBalance] = useState("£14,892.40");
  const [securityQuestion, setSecurityQuestion] = useState("What was the name of your first pet?");
  const [lureHeadline, setLureHeadline] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sType = searchParams.get("scamType");
    const p = searchParams.get("persona") as PersonaId | null;
    const t = searchParams.get("template") as TemplateId | null;
    const op = searchParams.get("opener");
    const aId = searchParams.get("sourceAnalysisId");

    if (sType) {
      setScamType(sType);
      setName(`${sType} Decoy`);
    } else {
      setName("Digital Security Trap");
    }

    if (p && PERSONAS.some((x) => x.id === p)) setPersona(p);
    if (t && TEMPLATES.some((x) => x.id === t)) setTemplate(t);
    if (op) setOpener(op);
    if (aId) setSourceAnalysisId(aId);
  }, [searchParams]);

  useEffect(() => {
    const pDef = personaById(persona);
    if (!personaName) {
      setPersonaName(pDef.defaultName);
    }
  }, [persona, personaName]);

  const params = gullibilityParams(gullibility);
  const currentPersonaDef = personaById(persona);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/traps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || "Digital Security Trap",
          template,
          persona,
          personaName: personaName || currentPersonaDef.defaultName,
          gullibility,
          opener,
          scamType,
          sourceAnalysisId: sourceAnalysisId || undefined,
          portalBrand: template === "fake_login" ? (portalBrand || "Northwind Secure Bank") : undefined,
          decoyUsername: decoyUsername.trim() || undefined,
          decoyPassword: decoyPassword.trim() || undefined,
          decoyBalance: decoyBalance.trim() || undefined,
          securityQuestion: securityQuestion.trim() || undefined,
          lureHeadline: lureHeadline.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deploy decoy");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBrandPill = (brand: string) => {
    setPortalBrand(brand);
  };

  return (
    <div className="grid grid-cols-12 max-w-[1600px] mx-auto w-full border-b border-[var(--border-color)]">
      {/* Sidebar (Cols 1-4) */}
      <div className="col-span-12 md:col-span-4 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 md:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-4 h-4 text-[var(--accent-cobalt)]" />
            <span className="grid-sidebar-label">DECOY SPECIFICATION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mt-4">
            DEPLOY HONEYPOT
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-4 leading-relaxed">
            Construct a specialized, isolated decoy link. When a scammer accesses this target, our adaptive engine keeps them engaged in a convincing conversation, recording IP indicators and adversary actions.
          </p>

          <div className="mt-6 p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-[var(--accent-cobalt)] font-bold">
              <Info className="w-3.5 h-3.5" />
              <span>HONEYPOT AUTH BEHAVIOR</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              When a target accesses a Fake Login honeypot, <strong>any email and password</strong> entered will be captured and streamed live to your incident dashboard. You can also specify preset decoy credentials below.
            </p>
          </div>
        </div>

        {/* Dynamic Persona telemetry preview */}
        <div className="pt-8 border-t border-[var(--border-color)] space-y-4">
          <span className="grid-sidebar-label block">ENGINE PARAMETERS</span>
          <div className="p-4 border border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">ARCHETYPE:</span>
              <span className="font-bold">{currentPersonaDef.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">SLIDER STATE:</span>
              <span className="font-bold text-[var(--accent-cobalt)]">
                {gullibility}% ({gullibilityLabel(gullibility)})
              </span>
            </div>
            <div className="pt-2 border-t border-[var(--border-color)] space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Compliance probability:</span>
                <span className="font-bold">{Math.round(params.compliance * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Confusion / typo rate:</span>
                <span className="font-bold">{Math.round(params.confusion * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Stalling frequency:</span>
                <span className="font-bold">{Math.round(params.delay * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form (Cols 5-12) */}
      <div className="col-span-12 md:col-span-8 p-8 md:p-12 space-y-8 max-w-3xl">
        {error && (
          <div className="p-4 border border-red-500 bg-red-500/10 text-red-500 text-xs font-mono">
            ERROR: {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Name and Template */}
          <div className="space-y-4">
            <span className="grid-sidebar-label block">01. DECOY IDENTITY & TEMPLATE</span>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="trap-name">
                Decoy Label
              </label>
              <input
                id="trap-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asset Recovery Trap"
                className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => tmpl.available && setTemplate(tmpl.id)}
                  disabled={!tmpl.available}
                  className={`p-5 text-left border transition-all rounded-none ${
                    template === tmpl.id
                      ? "border-[var(--accent-cobalt)] bg-[var(--bg-surface)] ring-1 ring-[var(--accent-cobalt)]"
                      : "border-[var(--border-color)] bg-transparent opacity-80 hover:opacity-100"
                  } ${!tmpl.available ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm uppercase tracking-tight">
                      {tmpl.label}
                    </span>
                    {!tmpl.available && (
                      <span className="text-[10px] font-mono bg-black/10 dark:bg-white/10 px-1.5 py-0.5">
                        STRETCH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {tmpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Persona Archetype */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
            <span className="grid-sidebar-label block">02. PERSONA ARCHETYPE</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setPersona(p.id);
                    setPersonaName(p.defaultName);
                  }}
                  className={`p-5 text-left border transition-all rounded-none ${
                    persona === p.id
                      ? "border-[var(--accent-cobalt)] bg-[var(--bg-surface)] ring-1 ring-[var(--accent-cobalt)]"
                      : "border-[var(--border-color)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className="font-extrabold text-sm uppercase tracking-tight block mb-1">
                    {p.label}
                  </span>
                  <div className="text-[11px] font-mono text-[var(--accent-cobalt)] mb-2 font-bold">
                    {p.defaultName}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {p.behaviour}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="persona-name">
                Persona Display Name (Fictional)
              </label>
              <input
                id="persona-name"
                type="text"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Ramesh Sharma"
                className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
              />
              <div className="mt-2.5">
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block mb-1.5 font-bold">
                  Preset Indian & Global Persona Names:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Ramesh Sharma",
                    "Priya Patel",
                    "Ankit Verma",
                    "Sunita Mukherjee",
                    "Rajesh Iyer",
                    "Amitabh Sen",
                    "Deepak Joshi",
                    "Pooja Deshmukh",
                    "Margaret Hollis",
                    "Richard Vance",
                  ].map((pName) => (
                    <button
                      key={pName}
                      type="button"
                      onClick={() => setPersonaName(pName)}
                      className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                        personaName === pName
                          ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-bold"
                          : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {pName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Gullibility Slider */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <span className="grid-sidebar-label">03. GULLIBILITY INDEX</span>
              <span className="text-xs font-mono font-bold text-[var(--accent-cobalt)]">
                {gullibility}% — {gullibilityLabel(gullibility).toUpperCase()}
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={100}
                value={gullibility}
                onChange={(e) => setGullibility(Number(e.target.value))}
                className="w-full h-2 bg-[var(--border-color)] appearance-none cursor-pointer accent-[var(--accent-cobalt)] rounded-none"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] uppercase">
                <span>0: SUPER HELPFUL (COMPLIANT)</span>
                <span>50: BALANCED</span>
                <span>100: MAX CONFUSION (STALLING)</span>
              </div>
            </div>
          </div>

          {/* Step 4: MANUAL DATA & TARGET SPECIFICATIONS (New Customization Section) */}
          <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-3.5 h-3.5 text-[var(--accent-cobalt)]" />
                <span className="grid-sidebar-label">04. MANUAL DECOY DATA & TARGET SPECIFICATIONS</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Manually calibrate decoy target credentials, phishing lure notices, and fictional brand assets.
              </p>
            </div>

            {template === "fake_login" ? (
              <div className="space-y-5 p-5 border border-[var(--border-color)] bg-[var(--bg-surface)]">
                {/* Brand / Institution Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="portal-brand">
                    Target Portal / Institution Brand
                  </label>
                  <input
                    id="portal-brand"
                    type="text"
                    value={portalBrand}
                    onChange={(e) => setPortalBrand(e.target.value)}
                    placeholder="e.g. State Bank of India (SBI)"
                    className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  />
                  <div className="space-y-2 mt-2.5">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block mb-1 font-bold">
                        Indian Bank Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "State Bank of India (SBI)",
                          "HDFC Bank NetBanking",
                          "ICICI Bank",
                          "Axis Bank NetBanking",
                          "Punjab National Bank (PNB)",
                          "Bank of Baroda",
                          "Kotak Mahindra Bank",
                          "Canara Bank",
                          "Paytm Payments Bank",
                          "Union Bank of India",
                        ].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleBrandPill(b)}
                            className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                              portalBrand === b
                                ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-bold"
                                : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-[var(--text-muted)] block mb-1 font-bold">
                        Global & Enterprise Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Northwind Secure Bank",
                          "PayPal Verification",
                          "Chase Online Security",
                          "Corporate SSO Gateway",
                          "Meta Account Recovery",
                        ].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleBrandPill(b)}
                            className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                              portalBrand === b
                                ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-bold"
                                : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Username / Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="decoy-user">
                      Preset Decoy Username / Email
                    </label>
                    <input
                      id="decoy-user"
                      type="text"
                      value={decoyUsername}
                      onChange={(e) => setDecoyUsername(e.target.value)}
                      placeholder="e.g. ramesh.sharma91@gmail.com or 84192031"
                      className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                    />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-1">
                      (Optional: any email entered by intruder is captured)
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="decoy-pass">
                      Preset Decoy Password
                    </label>
                    <input
                      id="decoy-pass"
                      type="text"
                      value={decoyPassword}
                      onChange={(e) => setDecoyPassword(e.target.value)}
                      placeholder="e.g. NetBank#2026 or leave blank for any"
                      className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                    />
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block mt-1">
                      (Optional: accepts any password by default)
                    </span>
                  </div>
                </div>

                {/* Phishing Lure Alert / Headline */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="lure-headline">
                    Phishing Lure Headline / Alert (Notice)
                  </label>
                  <input
                    id="lure-headline"
                    type="text"
                    value={lureHeadline}
                    onChange={(e) => setLureHeadline(e.target.value)}
                    placeholder="e.g. Urgent KYC Update: Complete NetBanking verification within 24 hours to prevent account suspension."
                    className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  />
                </div>

                {/* Balance & Security Question */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="decoy-bal">
                      Decoy Account Balance
                    </label>
                    <input
                      id="decoy-bal"
                      type="text"
                      value={decoyBalance}
                      onChange={(e) => setDecoyBalance(e.target.value)}
                      placeholder="₹85,450.00"
                      className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["₹85,450.00", "₹1,42,800.00", "₹25,000.00", "₹3,50,000.00", "£14,892.40", "$18,250.00"].map((bal) => (
                        <button
                          key={bal}
                          type="button"
                          onClick={() => setDecoyBalance(bal)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 border ${
                            decoyBalance === bal
                              ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-bold"
                              : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {bal}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="sec-question">
                      Fake Security Challenge Question
                    </label>
                    <input
                      id="sec-question"
                      type="text"
                      value={securityQuestion}
                      onChange={(e) => setSecurityQuestion(e.target.value)}
                      placeholder="What was the name of your first school or pet?"
                      className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[
                        "What is your mother's maiden name?",
                        "What was the name of your first school in Delhi/Mumbai?",
                        "What is your primary branch home city?",
                        "What was the name of your first pet?",
                      ].map((sq) => (
                        <button
                          key={sq}
                          type="button"
                          onClick={() => setSecurityQuestion(sq)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 border truncate max-w-[200px] ${
                            securityQuestion === sq
                              ? "border-[var(--accent-cobalt)] bg-[var(--accent-cobalt)]/15 text-[var(--accent-cobalt)] font-bold"
                              : "border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                          title={sq}
                        >
                          {sq}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-5 border border-[var(--border-color)] bg-[var(--bg-surface)]">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider block mb-2" htmlFor="scam-type">
                    Scam Scenario / Fraud Context
                  </label>
                  <input
                    id="scam-type"
                    type="text"
                    value={scamType}
                    onChange={(e) => setScamType(e.target.value)}
                    placeholder="e.g. Crypto Recovery Fee, Overdue Invoice, Prize Clearance"
                    className="w-full p-3 border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider block" htmlFor="opener">
                    Conversation Opener (Persona Opening Line)
                  </label>
                  <textarea
                    id="opener"
                    rows={3}
                    value={opener}
                    onChange={(e) => setOpener(e.target.value)}
                    placeholder="Leave blank to use the archetype default greeting..."
                    className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-mono focus:outline-none focus:border-[var(--accent-cobalt)] rounded-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Deploy Button */}
          <div className="pt-4 flex items-center gap-4">
            <button
              type="submit"
              disabled={loading}
              className="poster-btn w-full sm:w-auto"
            >
              {loading ? "Deploying Honeypot..." : "Deploy Digital Trap"}
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-4 py-2"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewTrapPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="p-12 text-center font-mono text-xs">LOADING DECOY SPECIFICATION...</div>}>
          <CreateTrapForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

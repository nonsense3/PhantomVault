import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ConsoleButton } from "@/components/console-button";
import { getCurrentUser } from "@/lib/server/auth";
import { ArrowRight, ShieldCheck, Zap, Terminal, Clock, Lock, Sparkles } from "lucide-react";

export default async function HomePage() {
  const user = await getCurrentUser();
  const isLoggedIn = !!user;
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />

      <main className="flex-1 w-full">
        {/* ================================================================= */}
        {/* HERO SECTION (Min-height 85vh, Strict 12-Column Grid)             */}
        {/* ================================================================= */}
        <section className="min-h-[85vh] border-b border-[var(--border-color)]">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 min-h-[85vh]">
            {/* Columns 1-3: Label Sidebar */}
            <div className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-[var(--text-primary)]" />
                  <span className="grid-sidebar-label">MANIFESTO</span>
                </div>
              </div>

              <div className="hidden md:block pt-8 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                <span className="font-bold uppercase tracking-wider block text-[var(--text-primary)] mb-1">
                  REALITY-FIRST DEFENSE
                </span>
                We do not ignore scams. We absorb their operational capital.
              </div>
            </div>

            {/* Columns 4-12: Primary Hero Content */}
            <div className="col-span-12 md:col-span-9 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest border border-[var(--border-color)] bg-[var(--bg-surface)] w-fit">
                <span className="w-2 h-2 bg-[var(--accent-cobalt)] animate-pulse" />
                DIGITAL DECOY & THREAT INTELLIGENCE
              </div>

              <h1 className="headline-hero text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight mb-6">
                FORWARD A SCAM. <br />
                <span className="text-[var(--accent-cobalt)]">WASTE THEIR TIME.</span> <br />
                TAKE THE EVIDENCE.
              </h1>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-center mt-6 pt-8 border-t border-[var(--border-color)]">
                <div className="xl:col-span-7">
                  <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-[560px]">
                    Deploy adaptive digital honeypots in 60 seconds. When an intruder strikes, multimodal AI personas engage them in convincing, endless conversations—stalling their operations while passively collecting structured forensic threat intelligence.
                  </p>
                </div>

                <div className="xl:col-span-5 flex flex-wrap items-center gap-3.5">
                  <ConsoleButton initialLoggedIn={isLoggedIn} className="poster-btn whitespace-nowrap">
                    <span>Enter Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </ConsoleButton>
                  <Link
                    href="/analyze"
                    className="poster-btn-secondary whitespace-nowrap"
                    title="Analyze suspicious emails, screenshots, or URLs"
                  >
                    <span>Analyze Threat</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* SYSTEM / FEATURE GRID (Cols 1-3 Sidebar, Cols 4-12 Content)       */}
        {/* ================================================================= */}
        <section className="border-b border-[var(--border-color)]">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12">
            {/* Sidebar */}
            <div className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8">
              <div className="md:sticky md:top-28">
                <span className="grid-sidebar-label">SYSTEM ARCHITECTURE</span>
                <p className="text-xs text-[var(--text-secondary)] mt-4">
                  Autonomous engagement protocols designed to exhaust malicious resources without human exposure.
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-12 md:col-span-9 p-8 md:p-16">
              <div className="mb-12">
                <h2 className="headline-section text-3xl sm:text-5xl text-[var(--text-primary)]">
                  DECEPTION. <br />
                  ATTRITION. <br />
                  EXTRACTION.
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-[var(--border-color)]">
                {/* 01 Cell */}
                <div className="border-r border-b border-[var(--border-color)] p-8 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <span className="font-mono text-xs font-bold text-[var(--accent-cobalt)] block mb-6">
                    [01]
                  </span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight mb-3">
                    MULTIMODAL SCAM ANALYZER
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Upload suspicious email screenshots, paste invoices, or input scam links. Computer vision and heuristic reasoning instantly dissect phishing anatomy, threat level, and indicators.
                  </p>
                </div>

                {/* 02 Cell */}
                <div className="border-r border-b border-[var(--border-color)] p-8 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <span className="font-mono text-xs font-bold text-[var(--accent-cobalt)] block mb-6">
                    [02]
                  </span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight mb-3">
                    ADAPTIVE PERSONA TRAPS
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Choose from Gullible Senior, Angry Executive, or Distracted Freelancer. Adjust the Gullibility Slider to inject convincing typos, delays, and requests for clarification that trap attackers for hours.
                  </p>
                </div>

                {/* 03 Cell */}
                <div className="border-r border-b border-[var(--border-color)] p-8 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors">
                  <span className="font-mono text-xs font-bold text-[var(--accent-cobalt)] block mb-6">
                    [03]
                  </span>
                  <h3 className="text-xl font-extrabold uppercase tracking-tight mb-3">
                    THREAT INTEL & IOC EXPORT
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Every IP, crypto address, bank routing number, phishing domain, and phone number is passively extracted, deduplicated, and exportable into bank-compliant JSON incident reports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* WHY DIFFERENT / COMPARISON LIST                                   */}
        {/* ================================================================= */}
        <section className="border-b border-[var(--border-color)]">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12">
            {/* Sidebar */}
            <div className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8">
              <div className="md:sticky md:top-28">
                <span className="grid-sidebar-label">WHY DIFFERENT</span>
                <p className="text-xs text-[var(--text-secondary)] mt-4">
                  Traditional cybersecurity tells you to delete the email. PhantomVault weaponizes the interaction.
                </p>
              </div>
            </div>

            {/* Content Stack */}
            <div className="col-span-12 md:col-span-9">
              <div className="divide-y divide-[var(--border-color)]">
                {[
                  {
                    idx: "001",
                    title: "ZERO OFFENSIVE RISK",
                    subtitle: "Completely passive containment",
                    desc: "No hacking back, no counter-malware, no legal exposure. We feed attackers mathematically invalid test cards, dummy OTPs, and fake receipts.",
                  },
                  {
                    idx: "002",
                    title: "REVERSES ECONOMIC INCENTIVES",
                    subtitle: "Raising attacker operational cost",
                    desc: "Scam operations scale because victim interaction costs pennies. Wasting 45 minutes of a scammer's time drastically reduces their throughput.",
                  },
                  {
                    idx: "003",
                    title: "REALITY-FIRST DESIGN",
                    subtitle: "Pure clarity, zero fluff",
                    desc: "Constructed with strict 12-column grids, zero-radius borders, high typographic impact, and immediate forensic utility.",
                  },
                  {
                    idx: "004",
                    title: "STANDALONE OR ENTERPRISE READY",
                    subtitle: "Zero technical expertise required",
                    desc: "Any freelancer, creator, or individual can generate a trap link in 3 clicks and watch the conversation stream live.",
                  },
                ].map((item) => (
                  <div
                    key={item.idx}
                    className="p-8 md:p-12 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group flex flex-col md:flex-row md:items-start justify-between gap-6"
                  >
                    <div className="flex items-baseline gap-6">
                      <span className="font-mono text-sm text-[var(--text-muted)]">
                        {item.idx}
                      </span>
                      <div>
                        <h3 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight group-hover:text-[var(--accent-cobalt)] transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs font-mono uppercase tracking-widest text-[var(--text-muted)] mt-1">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>



        {/* ================================================================= */}
        {/* ACCESS / PRICING SECTION (Min-height 50vh, 8xl Headline)           */}
        {/* ================================================================= */}
        <section className="min-h-[50vh] border-b border-[var(--border-color)]">
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 min-h-[50vh]">
            {/* Sidebar */}
            <div className="col-span-12 md:col-span-3 border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 flex flex-col justify-between">
              <div>
                <span className="grid-sidebar-label">ACCESS</span>
                <p className="text-xs text-[var(--text-secondary)] mt-4">
                  Open threat intelligence center for creators, small businesses, and individuals.
                </p>
              </div>
              <div className="text-xs font-mono text-[var(--text-muted)]">
                STRICT RATE LIMITS APPLIED
              </div>
            </div>

            {/* Content */}
            <div className="col-span-12 md:col-span-9 p-8 md:p-16 flex flex-col justify-between">
              <div>
                <h2 className="headline-hero text-3xl sm:text-5xl md:text-6xl text-[var(--text-primary)] mb-6">
                  START EXPLORING.
                </h2>
                <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
                  Generate your first digital trap in under 60 seconds. Paste a suspicious message, deploy a shareable decoy, and watch threat data populate in real time.
                </p>
              </div>

              <div className="pt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-[var(--border-color)] mt-12">
                <div className="text-xs font-mono text-[var(--text-secondary)]">
                  READY TO TEST WITH DEMO CREDENTIALS: <br />
                  <span className="font-bold text-[var(--text-primary)]">demo@phantomvault.ai / phantomvault</span>
                </div>
                <ConsoleButton
                  initialLoggedIn={isLoggedIn}
                  className="poster-btn text-base"
                >
                  <span>Launch PhantomVault Console</span>
                  <ArrowRight className="w-4 h-4" />
                </ConsoleButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

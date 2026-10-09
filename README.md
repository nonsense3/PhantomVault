# PhantomVault AI — Digital Decoy & Threat Intelligence Center

> **Track:** Gemma 4 | **Version:** 1.0 (Hackathon MVP) | **Owner:** Ankit Dey  
> **One-Line Pitch:** *Forward a scam, and let AI waste the scammer's time while you collect the evidence.*

---

## 1. Overview & Architecture

PhantomVault AI is a web-based **Digital Decoy and Active Threat Intelligence Center**. Everyday individuals and small businesses can deploy isolated digital honeypots (fake login portals, scambaiting conversation channels) in under 60 seconds.

When an adversary interacts with a decoy, a Gemma 4 powered persona engages them in a convincing conversation, stalling their operations while passively extracting technical indicators of compromise (crypto addresses, phishing links, spoofed domains, rogue IPs, bank accounts) into an exportable forensic dossier.

### Design System: Reality-First Poster Modernism
- **Base Aesthetic:** Monochromatic base with a single vibrant Cobalt Blue accent (`#1351AA`).
- **Light & Dark Mode:**
  - **Light Mode:** Soft Cream background (`#E3E2DE`), Jet Black text (`#141414`), Light Gray borders (`#C7C7C7`).
  - **Dark Mode:** Monochromatic Charcoal/Jet (`#0E0E0E` / `#141414`), Cream text (`#E3E2DE`), Dark Gray borders (`#272727`).
- **Strict Structural Elements:**
  - 12-column locked vertical flow with 3-column sticky sidebar metadata labels.
  - Zero-radius borders (`0px` corners throughout: `rounded-none`).
  - High typographic impact powered by **General Sans** with negative tracking.
  - Zero fluff: flat color blocks, linear transitions, pure forensic clarity.
- **Branding:** Original logo and favicon embedded across all console views and application headers.

---

## 2. Gemma 4 Core Capabilities Demonstrated

| Capability | Implementation in PhantomVault |
| --- | --- |
| **Multimodal Vision** | Uploading scam screenshots to the **Scam Analyzer** (`/analyze`) where the vision core reads text, identifies fraudulent sender signatures, and classifies phishing techniques. |
| **Structured Output & Function Calling** | The analyzer and persona conversation loops return typed JSON containing threat levels, red flags, extracted IoCs, and mitigation actions (`Sent a fake OTP`, `Demanded escalation`, `Generated fake bank receipt`). |
| **Long-Context Persona Reasoning** | 3 distinct behavioral archetypes (**Gullible Senior**, **Angry Executive**, **Distracted Freelancer**) that maintain narrative consistency across dozens of turns. |
| **Gullibility Control Model** | Slider (0–100) dynamically tunes compliance probability, stalling behavior, and typo injection rates. |
| **Fail-Safe Client Abstraction** | Seamlessly connects to hosted Gemma 4 (`gemma-4-31b-it`) via Google AI Studio API when `GEMMA_API_KEY` is present in `web/.env`, with automatic offline fallback to the deterministic engine. |

---

## 3. Quick Start (Running Locally)

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.11 with Turbopack)
- **NPM**: v9+

### Setup & Launch
1. Navigate to the web application directory:
   ```bash
   cd web
   ```
2. Configuration is already prepared in `web/.env`:
   ```bash
   # In web/.env
   NODE_ENV=development
   SESSION_SECRET=phantom_vault_ultra_secure_session_secret_key_32chars_long_2026
   AI_PROVIDER=auto
   GEMMA_API_KEY=YOUR_GEMMA_API_KEY_HERE   # Paste your Google AI Studio key here
   GEMMA_MODEL=gemma-4-31b-it
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Evaluation Credentials
The platform includes pre-seeded demo traps and multi-turn threat incidents:
- **Email:** `demo@phantomvault.ai`
- **Password:** `phantomvault`  
*(Or click the **"PREFILL DEMO ACCOUNT"** button on `/login`)*

---

## 4. Key Screens & Route Index

- **`/` — Landing Page:** Manifesto, 12-column System Architecture grid, Why Different comparisons, live terminal spectator preview, and theme toggle.
- **`/login` & `/register` — Authentication:** Clean, privacy-first sign-in with instant demo prefill.
- **`/dashboard` — Operations Console:**
  - Real-time KPI cards: Active Decoys, Scammers Trapped, Live Time Wasted stopwatch ticker, IoC count.
  - Active Trap Network table with quick pause/resume toggles and shareable link copying.
  - **Live Incident Stream** updating in real time via Server-Sent Events (`/api/live`).
  - **"Simulate Attacker Turn"** button to inject live adversarial actions during presentations.
- **`/analyze` — Scam Analyzer:**
  - Multimodal analysis tab (raw text, suspicious URL, or screenshot upload).
  - Quick sample threat loader (AML Escrow Scam, Bank SMS, Overdue Invoice).
  - Detailed threat classification card with observed red flags and extracted IoCs.
  - One-click **"Turn into Decoy Trap"** prefill button.
- **`/traps/new` — Honeypot Deployment:**
  - Choose between *Forward-a-Scam Page* and *Fake Login Portal (Northwind Secure Bank)*.
  - Select persona archetype and configure the 0–100 Gullibility Index slider.
- **`/incidents/[id]` — Split-Screen Spectator View:**
  - Left pane: Adversary inbound transmissions.
  - Right pane: Decoy persona responses with typed action badges.
  - Live scammer time-wasted counter.
  - Interactive **"Simulate Scammer Turn"** button.
  - Evidence Vault tray with one-click copyable indicators.
  - **Export Evidence (JSON)** formatted for banks and authorities.
- **`/intel` — Threat Intelligence Center:**
  - Filterable IoC table (Crypto Wallets, Emails, Domains, URLs, IPs, Bank Accounts, Phone Numbers).
  - Search by address, domain, or indicator value with full JSON export.
- **`/settings` — Security & Policies:**
  - Data minimization retention slider (7–90 days).
  - Ethical confinement rules.
  - Designated **"Powered by Gemma 4"** specification badge.
- **`/t/[slug]` — Public Attacker Decoy:**
  - Zero tech-stack leakage (no vendor hints, clean fictional corporate branding).
  - Interactive fake bank login portal or personal reply channel.
  - Ethical abuse report modal at the footer.

---

## 5. Hackathon 3-Minute Live Demo Script

1. **The Hook (0:00 - 0:20):**
   > *"Scammers target millions daily because interacting costs them nothing. PhantomVault inverts that equation by deploying autonomous digital honeypots that consume their operational time while harvesting evidence."*
2. **Analyze a Threat (0:20 - 1:00):**
   > Navigate to `/analyze`. Click "AML Escrow Scam" sample (or upload a screenshot). Click "Run Threat Analysis". Show Gemma 4 dissecting the threat: High risk, Advance-Fee Fraud, red flags, and extracted crypto wallet.
3. **Deploy a Decoy in 3 Clicks (1:00 - 1:30):**
   > Click "Turn into Decoy Trap". Select the "Angry Executive" archetype, dial the Gullibility Slider to 75% ("Very Confused"), and click "Deploy Digital Trap". Copy the public trap link.
4. **Live Attacker Engagement (1:30 - 2:30):**
   > Open the Incident spectator view (`/incidents/inc_live_demo_01`). Watch the split-screen stream: on the left, the attacker demands cryptocurrency; on the right, the decoy generates a fake bank receipt and test card number. Click "Simulate Scammer Turn" to watch the live SSE stream update instantly as the time-wasted stopwatch advances.
5. **Extract Forensic Evidence (2:30 - 3:00):**
   > Highlight the Evidence Vault tray containing the captured wallet address, email, and IP. Click "Export Evidence (JSON)" to show the formal forensic report ready for fraud submission.

"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, Lock, Shield, CheckCircle, AlertCircle, Building2, HelpCircle } from "lucide-react";

interface DecoyClientProps {
  slug: string;
  trapName: string;
  template: string;
  personaName: string;
  status: string;
  portalBrand?: string;
  decoyUsername?: string;
  decoyPassword?: string;
  decoyBalance?: string;
  securityQuestion?: string;
  lureHeadline?: string;
}

interface ChatMsg {
  id?: string;
  role: "attacker" | "ai";
  content: string;
  createdAt?: string;
}

export function DecoyClient({
  slug,
  trapName,
  template,
  personaName,
  status,
  portalBrand = "Northwind Secure Bank",
  decoyUsername = "",
  decoyPassword = "",
  decoyBalance = "£14,892.40",
  securityQuestion: initialSecurityQuestion = "What was the name of your first pet?",
  lureHeadline,
}: DecoyClientProps) {
  // For chat template
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);

  // For fake login template
  const [portalScreen, setPortalScreen] = useState<"login" | "otp" | "security" | "account" | "receipt">("login");
  const [portalNotice, setPortalNotice] = useState<string | null>(null);
  const [portalTone, setPortalTone] = useState<"info" | "error" | "success">("info");
  const [securityQuestion, setSecurityQuestion] = useState(initialSecurityQuestion);
  const [attempts, setAttempts] = useState(0);

  // Form fields
  const [loginId, setLoginId] = useState(decoyUsername);
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [wirePayee, setWirePayee] = useState("");
  const [wireAmount, setWireAmount] = useState("");
  const [wireAccount, setWireAccount] = useState("");

  // Abuse modal
  const [showAbuse, setShowAbuse] = useState(false);
  const [abuseDetails, setAbuseDetails] = useState("");
  const [abuseContact, setAbuseContact] = useState("");
  const [abuseSubmitted, setAbuseSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize session
    fetch(`/api/t/${slug}/init`, { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.messages) {
          setMessages(
            data.messages.map((m: { id?: string; role: "attacker" | "ai"; content: string; createdAt?: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            }))
          );
        }
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text || loading) return;

    setInputMsg("");
    setMessages((prev) => [...prev, { role: "attacker", content: text }]);
    setLoading(true);
    setTyping(true);

    try {
      const res = await fetch(`/api/t/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (res.ok && data?.reply) {
        // Small realistic reading delay
        setTimeout(() => {
          setTyping(false);
          setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
        }, 1200);
      } else {
        setTyping(false);
      }
    } catch {
      setTyping(false);
    } finally {
      setLoading(false);
    }
  };

  const submitPortalEvent = async (step: "login" | "otp" | "security" | "transfer", data: Record<string, string>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/t/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalEvent: { step, data },
          attempts,
        }),
      });

      const json = await res.json();
      if (res.ok && json.portalResult) {
        const pr = json.portalResult;
        setPortalScreen(pr.screen);
        setPortalNotice(pr.notice);
        setPortalTone(pr.tone);
        if (pr.question) setSecurityQuestion(pr.question);
        setAttempts((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/t/${slug}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ details: abuseDetails, contact: abuseContact }),
    });
    setAbuseSubmitted(true);
  };

  if (status !== "active") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md p-8 border border-zinc-300 bg-white text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">Service Temporarily Unavailable</h2>
          <p className="text-xs text-zinc-600">
            This verification link is currently paused or expired. Please contact the sender for an updated channel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* =============================================================== */}
      {/* TEMPLATE A: FAKE LOGIN (Northwind Secure Bank)                  */}
      {/* =============================================================== */}
      {template === "fake_login" ? (
        <div className="flex-1 flex flex-col">
          {/* Fictional Bank Header */}
          <header className="bg-[#0D2447] text-white py-4 px-6 border-b border-[#081831]">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-[#4F8BE8]" />
                <span className="font-bold text-lg tracking-tight uppercase">{portalBrand}</span>
              </div>
              <div className="text-xs text-blue-200 flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5" />
                <span>256-Bit SSL Encrypted Session</span>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-md w-full mx-auto p-6 flex flex-col justify-center">
            {lureHeadline && (
              <div className="mb-4 p-3 border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">Security Alert / Action Required</span>
                  <span className="leading-relaxed">{lureHeadline}</span>
                </div>
              </div>
            )}

            <div className="bg-white border border-zinc-300 p-8 shadow-sm">
              <div className="mb-6 text-center">
                <h1 className="text-xl font-bold text-zinc-900">
                  {portalScreen === "login" && "Online Banking Sign In"}
                  {portalScreen === "otp" && "Multi-Factor Verification"}
                  {portalScreen === "security" && "Security Identity Challenge"}
                  {portalScreen === "account" && "Client Account Dashboard"}
                  {portalScreen === "receipt" && "Payment Confirmation Scheduled"}
                </h1>
                <p className="text-xs text-zinc-500 mt-1">
                  Secure Customer Verification System
                </p>
              </div>

              {portalNotice && (
                <div
                  className={`p-3 text-xs mb-6 border ${
                    portalTone === "error"
                      ? "border-red-300 bg-red-50 text-red-700"
                      : portalTone === "success"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-blue-300 bg-blue-50 text-blue-800"
                  }`}
                >
                  {portalNotice}
                </div>
              )}

              {/* Screen 1: Login */}
              {portalScreen === "login" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitPortalEvent("login", { loginId, password });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">USER ID / ACCESS NUMBER / EMAIL</label>
                    <input
                      type="text"
                      required
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      placeholder={decoyUsername || "e.g. 84192031 or email@domain.com"}
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">PASSWORD / PASSCODE</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={decoyPassword ? "Enter decoy password..." : "••••••••••••"}
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                    {decoyPassword && (
                      <span className="text-[11px] text-zinc-500 mt-1 block font-mono">
                        Preset Decoy Password: <strong className="text-zinc-800">{decoyPassword}</strong>
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0D2447] hover:bg-[#07162E] text-white font-bold py-3 mt-2 transition-colors cursor-pointer"
                  >
                    {loading ? "Verifying..." : "Log In to Account"}
                  </button>
                  <div className="p-2.5 mt-2 bg-zinc-50 border border-zinc-200 text-zinc-500 text-[11px] text-center font-mono">
                    {decoyPassword ? (
                      <span>DECOY HONEYPOT: Configured with preset password <strong>{decoyPassword}</strong></span>
                    ) : (
                      <span>HONEYPOT ACTIVE: Any email & password will be safely trapped</span>
                    )}
                  </div>
                </form>
              )}

              {/* Screen 2: OTP */}
              {portalScreen === "otp" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitPortalEvent("otp", { otpCode });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">6-DIGIT VERIFICATION CODE</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full p-2.5 border border-zinc-300 text-center text-lg font-mono tracking-widest focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0D2447] hover:bg-[#07162E] text-white font-bold py-3 transition-colors cursor-pointer"
                  >
                    {loading ? "Validating code..." : "Submit Code"}
                  </button>
                </form>
              )}

              {/* Screen 3: Security Question */}
              {portalScreen === "security" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitPortalEvent("security", { question: securityQuestion, answer: securityAnswer });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">{securityQuestion}</label>
                    <input
                      type="text"
                      required
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Type your answer"
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0D2447] hover:bg-[#07162E] text-white font-bold py-3 transition-colors cursor-pointer"
                  >
                    {loading ? "Confirming answer..." : "Verify Identity"}
                  </button>
                </form>
              )}

              {/* Screen 4: Account wire portal */}
              {portalScreen === "account" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitPortalEvent("transfer", { payee: wirePayee, account: wireAccount, amount: wireAmount });
                  }}
                  className="space-y-4 text-xs"
                >
                  <div className="p-3 bg-zinc-100 border border-zinc-200">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">AVAILABLE BALANCE</div>
                    <div className="text-xl font-bold text-zinc-900">{decoyBalance}</div>
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">RECIPIENT NAME / PAYEE</label>
                    <input
                      type="text"
                      required
                      value={wirePayee}
                      onChange={(e) => setWirePayee(e.target.value)}
                      placeholder="e.g. Escrow Recovery Services"
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">SORT CODE & ACCOUNT / IBAN</label>
                    <input
                      type="text"
                      required
                      value={wireAccount}
                      onChange={(e) => setWireAccount(e.target.value)}
                      placeholder="00-00-00 12345678"
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">AMOUNT (£)</label>
                    <input
                      type="number"
                      required
                      value={wireAmount}
                      onChange={(e) => setWireAmount(e.target.value)}
                      placeholder="450.00"
                      className="w-full p-2.5 border border-zinc-300 focus:outline-none focus:border-[#0D2447]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#0D2447] hover:bg-[#07162E] text-white font-bold py-3 transition-colors cursor-pointer"
                  >
                    {loading ? "Processing Wire..." : "Authorize Wire Transfer"}
                  </button>
                </form>
              )}

              {/* Screen 5: Receipt */}
              {portalScreen === "receipt" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <div className="font-bold text-emerald-800 text-sm">Transfer Scheduled for Settlement</div>
                    <div className="font-mono text-zinc-600 text-xs mt-1">Ref: NWB-TX-9921-TEST-0042</div>
                  </div>
                  <p className="text-zinc-600 text-center leading-relaxed">
                    Under banking compliance rules, transfers to unverified payees take 3–5 working days to clear through clearinghouse inspection.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      ) : (
        /* =============================================================== */
        /* TEMPLATE B: FORWARD SCAM CONVERSATION                           */
        /* =============================================================== */
        <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 md:p-8">
          <header className="p-4 bg-white border border-zinc-300 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 text-white flex items-center justify-center font-bold text-sm">
                {personaName.charAt(0)}
              </div>
              <div>
                <h1 className="font-bold text-sm text-zinc-900">{personaName}</h1>
                <span className="text-[11px] text-emerald-600 font-medium">● Active Channel</span>
              </div>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Secure Direct Message
            </div>
          </header>

          {/* Chat feed */}
          <div className="flex-1 bg-white border border-zinc-300 p-4 overflow-y-auto min-h-[420px] max-h-[600px] space-y-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "attacker" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 text-xs leading-relaxed ${
                    m.role === "attacker"
                      ? "bg-[#0D2447] text-white"
                      : "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  }`}
                >
                  <div className="text-[9px] opacity-70 mb-1 font-bold">
                    {m.role === "attacker" ? "YOU" : personaName.toUpperCase()}
                  </div>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="bg-zinc-100 text-zinc-500 p-3 text-xs border border-zinc-200 italic animate-pulse">
                  {personaName} is typing a reply...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-zinc-300 bg-white text-xs focus:outline-none focus:border-[#0D2447]"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMsg.trim()}
              className="bg-[#0D2447] text-white px-5 py-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Footer & Ethical Abuse Reporting (PRD 14) */}
      <footer className="py-4 px-6 text-center text-[11px] text-zinc-500 border-t border-zinc-300">
        <button
          onClick={() => setShowAbuse(true)}
          className="hover:underline text-zinc-600 font-medium"
        >
          Report abuse or suspect deceptive activity on this channel
        </button>
      </footer>

      {/* Abuse Reporting Modal */}
      {showAbuse && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 border border-zinc-300 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-zinc-900">Abuse & Phishing Report</h3>
              <button
                onClick={() => setShowAbuse(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {abuseSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-center space-y-2">
                <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold">Report Received</p>
                <p className="text-[11px]">This channel identifier has been flagged for administrative review.</p>
                <button
                  onClick={() => {
                    setShowAbuse(false);
                    setAbuseSubmitted(false);
                  }}
                  className="mt-3 px-3 py-1 bg-emerald-700 text-white font-bold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAbuseSubmit} className="space-y-3">
                <p className="text-zinc-600">
                  If this link was sent to you maliciously or unsolicited, report the context below.
                </p>
                <div>
                  <label className="font-bold block mb-1">Details of incident / complaint</label>
                  <textarea
                    rows={3}
                    required
                    value={abuseDetails}
                    onChange={(e) => setAbuseDetails(e.target.value)}
                    placeholder="Describe how you received this link..."
                    className="w-full p-2 border border-zinc-300"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Your contact email (optional)</label>
                  <input
                    type="email"
                    value={abuseContact}
                    onChange={(e) => setAbuseContact(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full p-2 border border-zinc-300"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAbuse(false)}
                    className="px-3 py-1.5 border border-zinc-300 text-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-red-600 text-white font-bold"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

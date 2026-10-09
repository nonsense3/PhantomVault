import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { generateDecoyResponse } from "@/lib/server/ai";
import { extractIocs } from "@/lib/server/ai/iocs";
import {
  createMessage,
  getIncidentById,
  getTrapById,
  listMessages,
  updateIncident,
  upsertIoc,
} from "@/lib/server/repo";

const SIMULATED_ATTACKER_SCRIPTS: Record<string, string[]> = {
  crypto: [
    "Send the $300 transaction processing fee to the Bitcoin address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh right now so we can release your funds.",
    "Did you transfer the network gas fee yet? Time is running out before the smart contract burns the asset.",
    "Give me your seed phrase or private key so our technician can manually synchronize the recovery node.",
    "We need confirmation. Send the transaction hash or receipt slip immediately.",
    "If you do not pay the remaining $150 we will close your claim permanently.",
  ],
  bank: [
    "This is Officer David Miller from Fraud Prevention. Your card ending in 4192 has been compromised with $2,400 charged in Miami. We need you to confirm your full card number and CVV to reverse the charge.",
    "A 6-digit one-time code has just been sent to your phone. Read it back to me immediately so I can freeze the unauthorized wire.",
    "Hurry, the scammer is trying to withdraw from your account as we speak! What is the code on your screen?",
    "We have established a secure vault account. Wire the remaining balance to sort code 40-12-88 account 99120482 to safeguard your money.",
    "Why are you taking so long? If you disconnect this call, your account will be permanently terminated.",
  ],
  invoice: [
    "Attention: Invoice #INV-88219 for $1,850.00 is now 14 days overdue. Please remit payment to our updated ACH routing 021000021 account 88391204 by end of business.",
    "Failure to settle this invoice today will result in immediate escalation to collections and credit bureau reporting.",
    "Please send the remittance confirmation or bank voucher as an attachment or reply here.",
    "Our accounting department has not received the wire. Confirm the exact reference ID you used.",
  ],
};

export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;

    const incident = await getIncidentById(user.id, id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const trap = await getTrapById(user.id, incident.trapId);
    if (!trap) {
      return NextResponse.json({ error: "Trap not found" }, { status: 404 });
    }

    const priorMessages = await listMessages(user.id, incident.id);
    const attackerCount = priorMessages.filter((m) => m.role === "attacker").length;

    // For fake login honeypots, simulate portal credential and OTP submissions
    if (trap.template === "fake_login") {
      const stepIndex = attackerCount % 4;
      let portalPayload = "";
      const brand = trap.config.portalBrand || "Banking Portal";

      if (stepIndex === 0) {
        const fakeUser = trap.config.decoyUsername || "victim_login@netbank.in";
        const fakePass = trap.config.decoyPassword || "SecureKey#2026";
        portalPayload = `[CAPTURED LOGIN CREDENTIALS]\n• Username/Email: ${fakeUser}\n• Password: ${fakePass}\n• Client Auth Status: Intercepted & Honeypot Redirected`;
      } else if (stepIndex === 1) {
        portalPayload = `[CAPTURED 2FA / OTP CODE]\n• Submitted Code: 649201\n• Challenge: SMS-OTP Verification for ${brand}\n• Honeypot Action: Flagged invalid, forcing adversary retry`;
      } else if (stepIndex === 2) {
        const q = trap.config.securityQuestion || "What was your mother's maiden name?";
        portalPayload = `[CAPTURED SECURITY CHALLENGE]\n• Question: ${q}\n• Answer: Mukherjee\n• PIN: 8392`;
      } else {
        const amt = trap.config.decoyBalance || "₹85,000.00";
        portalPayload = `[CAPTURED WIRE TRANSFER INSTRUCTIONS]\n• Payee: Escrow Liquidity Node / UPI 9821049281@oksbi\n• Account / VPA: 0928192038192\n• Amount: ${amt}\n• Status: Trapped in sandbox settlement queue`;
      }

      const attackerMsg = await createMessage({
        incidentId: incident.id,
        ownerId: user.id,
        role: "attacker",
        content: portalPayload,
        kind: "form_submit",
      });

      const iocs = extractIocs(portalPayload);
      for (const ioc of iocs) {
        await upsertIoc({
          incidentId: incident.id,
          ownerId: user.id,
          type: ioc.type,
          value: ioc.value,
          confidence: ioc.confidence,
        });
      }

      await updateIncident(user.id, incident.id, {
        lastActivityAt: new Date().toISOString(),
        timeWastedSeconds: incident.timeWastedSeconds + 45,
        threatLevel: "High",
        summary: `Captured credential submissions on honeypot: ${brand}`,
      });

      return NextResponse.json({
        attackerMessage: attackerMsg,
        extractedIocs: iocs,
        engine: "honeypot_login_portal",
      });
    }

    // Pick a topic script for chat honeypots
    const topic = incident.scamType?.toLowerCase().includes("invoice")
      ? "invoice"
      : incident.scamType?.toLowerCase().includes("bank") || incident.scamType?.toLowerCase().includes("phish")
      ? "bank"
      : "crypto";

    const scriptPool = SIMULATED_ATTACKER_SCRIPTS[topic] || SIMULATED_ATTACKER_SCRIPTS.crypto;
    const attackerText = scriptPool[attackerCount % scriptPool.length];

    // 1. Record attacker message
    const attackerMsg = await createMessage({
      incidentId: incident.id,
      ownerId: user.id,
      role: "attacker",
      content: attackerText,
      kind: "text",
    });

    // 2. Extract IoCs from attacker message
    const iocs = extractIocs(attackerText);
    for (const ioc of iocs) {
      await upsertIoc({
        incidentId: incident.id,
        ownerId: user.id,
        type: ioc.type,
        value: ioc.value,
        confidence: ioc.confidence,
      });
    }

    // 3. Generate decoy response
    const allHistory = [...priorMessages, attackerMsg].map((m) => ({
      role: m.role,
      content: m.content,
      action: m.action,
    }));

    const aiRes = await generateDecoyResponse({
      incidentId: incident.id,
      trapId: trap.id,
      trapName: trap.name,
      template: trap.template,
      persona: trap.persona,
      personaName: trap.config.personaName,
      gullibility: trap.gullibility,
      attackerMessage: attackerText,
      history: allHistory,
      turn: allHistory.length,
      maxTurns: 30,
    });

    // 4. Record AI message
    const aiMsg = await createMessage({
      incidentId: incident.id,
      ownerId: user.id,
      role: "ai",
      content: aiRes.reply,
      kind: aiRes.kind,
      action: aiRes.action,
    });

    // 5. Update incident status if ended
    if (aiRes.end) {
      await updateIncident(user.id, incident.id, {
        status: "ended",
        summary: `Session completed: ${aiRes.endReason || "Max turns reached"}`,
      });
    }

    return NextResponse.json({
      attackerMessage: attackerMsg,
      aiMessage: aiMsg,
      extractedIocs: iocs,
      engine: aiRes.engine,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Simulation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

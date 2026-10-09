import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  createIncident,
  createMessage,
  getIncidentBySessionKey,
  getTrapBySlug,
  listMessages,
  updateIncident,
  upsertIoc,
} from "@/lib/server/repo";
import {
  extractIocs,
  generateDecoyResponse,
  localPortalStep,
  type PortalEvent,
} from "@/lib/server/ai";

export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await props.params;
    const trap = await getTrapBySlug(slug);
    if (!trap) {
      return NextResponse.json({ error: "Trap not found" }, { status: 404 });
    }

    if (trap.status !== "active") {
      return NextResponse.json(
        { error: "This secure link is paused." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const cookieName = `pv_att_${trap.id}`;
    let sessionKey = cookieStore.get(cookieName)?.value;

    const reqHeaders = await headers();
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";

    let incident = sessionKey ? await getIncidentBySessionKey(sessionKey, trap.id) : null;

    if (!incident) {
      incident = await createIncident({
        trapId: trap.id,
        ownerId: trap.ownerId,
        sourceIp: ip,
        userAgent,
        scamType: trap.config.scamType || "Incoming Interaction",
      });
      cookieStore.set(cookieName, incident.sessionKey, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 3,
      });
    }

    const body = await req.json();

    // Check if this is a portal event (e.g. login form, OTP form) or conversation message
    if (body.portalEvent) {
      const pe = body.portalEvent as PortalEvent;
      const attempts = typeof body.attempts === "number" ? body.attempts : 0;

      // Extract and format message content for clear dashboard visibility
      let messageContent = `[Form submission - ${pe.step}]: ${JSON.stringify(pe.data)}`;
      if (pe.step === "login") {
        messageContent = `[CAPTURED LOGIN CREDENTIALS]\n• Username/Email: ${pe.data.loginId || "(none)"}\n• Password: ${pe.data.password || "(none)"}`;
      } else if (pe.step === "otp") {
        messageContent = `[CAPTURED 2FA / OTP CODE]\n• Submitted Code: ${pe.data.otpCode || "(none)"}`;
      } else if (pe.step === "security") {
        messageContent = `[CAPTURED SECURITY CHALLENGE]\n• Question: ${pe.data.question || "(none)"}\n• Answer: ${pe.data.answer || "(none)"}`;
      } else if (pe.step === "transfer") {
        messageContent = `[CAPTURED WIRE TRANSFER INSTRUCTIONS]\n• Payee: ${pe.data.payee || "(none)"}\n• Account / IBAN: ${pe.data.account || "(none)"}\n• Amount: £${pe.data.amount || "(none)"}`;
      }

      await createMessage({
        incidentId: incident.id,
        ownerId: trap.ownerId,
        role: "attacker",
        content: messageContent,
        kind: "form_submit",
      });

      // Explicitly capture email IoC if present
      if (pe.step === "login" && pe.data.loginId) {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pe.data.loginId);
        if (isEmail) {
          await upsertIoc({
            incidentId: incident.id,
            ownerId: trap.ownerId,
            type: "email",
            value: pe.data.loginId,
            confidence: 0.99,
          });
        }
      }

      // Extract any indicators typed by attacker (usernames, cards, account numbers)
      const enteredValues = Object.values(pe.data).join(" ");
      const foundIocs = extractIocs(enteredValues);
      for (const ioc of foundIocs) {
        await upsertIoc({
          incidentId: incident.id,
          ownerId: trap.ownerId,
          type: ioc.type,
          value: ioc.value,
          confidence: ioc.confidence,
        });
      }

      const portalRes = localPortalStep(
        pe,
        trap.gullibility,
        attempts,
        trap.config.personaName,
        {
          presetPassword: trap.config.decoyPassword,
          customSecurityQuestion: trap.config.securityQuestion,
        }
      );

      await createMessage({
        incidentId: incident.id,
        ownerId: trap.ownerId,
        role: "ai",
        content: `[Portal update]: ${portalRes.notice}`,
        action: portalRes.action,
        kind: portalRes.receipt ? "fake_data" : "text",
      });

      if (pe.step === "login") {
        await updateIncident(trap.ownerId, incident.id, {
          summary: `Captured credentials: ${pe.data.loginId || "User"} on ${trap.config.portalBrand || trap.name}`,
          threatLevel: "High",
        });
      }

      return NextResponse.json({
        portalResult: portalRes,
      });
    }

    // Standard chat / interaction message
    const attackerText = (body.message || "").trim();
    if (!attackerText) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Record attacker message
    await createMessage({
      incidentId: incident.id,
      ownerId: trap.ownerId,
      role: "attacker",
      content: attackerText,
      kind: "text",
    });

    // 2. Extract technical indicators of compromise
    const iocs = extractIocs(attackerText);
    for (const ioc of iocs) {
      await upsertIoc({
        incidentId: incident.id,
        ownerId: trap.ownerId,
        type: ioc.type,
        value: ioc.value,
        confidence: ioc.confidence,
      });
    }

    // 3. Load past message history for context
    const messages = await listMessages(trap.ownerId, incident.id);
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
      action: m.action,
    }));

    // 4. Generate next decoy persona reply
    const aiRes = await generateDecoyResponse({
      incidentId: incident.id,
      trapId: trap.id,
      trapName: trap.name,
      template: trap.template,
      persona: trap.persona,
      personaName: trap.config.personaName,
      gullibility: trap.gullibility,
      attackerMessage: attackerText,
      history,
      turn: history.length,
      maxTurns: 35,
    });

    // 5. Record AI message
    await createMessage({
      incidentId: incident.id,
      ownerId: trap.ownerId,
      role: "ai",
      content: aiRes.reply,
      kind: aiRes.kind,
      action: aiRes.action,
    });

    if (aiRes.end) {
      await updateIncident(trap.ownerId, incident.id, {
        status: "ended",
        summary: `Decoy concluded: ${aiRes.endReason || "Max turns reached"}`,
      });
    }

    return NextResponse.json({
      reply: aiRes.reply,
      action: aiRes.action,
      ended: aiRes.end,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

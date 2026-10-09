import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  createIncident,
  createMessage,
  getIncidentBySessionKey,
  getTrapBySlug,
  listMessages,
} from "@/lib/server/repo";
import { openerFor } from "@/lib/server/ai";

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
        { error: "This secure link is currently unavailable or paused." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const cookieName = `pv_att_${trap.id}`;
    const existingSessionKey = cookieStore.get(cookieName)?.value;

    const reqHeaders = await headers();
    const ip = reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || reqHeaders.get("x-real-ip") || "127.0.0.1";
    const userAgent = reqHeaders.get("user-agent") || "Unknown Browser";

    let incident = existingSessionKey ? await getIncidentBySessionKey(existingSessionKey, trap.id) : null;

    if (!incident) {
      incident = await createIncident({
        trapId: trap.id,
        ownerId: trap.ownerId,
        sourceIp: ip,
        userAgent,
        scamType: trap.config.scamType || "Incoming Interaction",
        threatLevel: "High",
      });

      cookieStore.set(cookieName, incident.sessionKey, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 3, // 3 days
      });

      // If there is an opener or template opener, send the initial persona greeting (chat templates only)
      if (trap.template !== "fake_login") {
        const opener = trap.config.opener || openerFor(trap.persona, trap.config.scamType || "inquiry");
        await createMessage({
          incidentId: incident.id,
          ownerId: trap.ownerId,
          role: "ai",
          content: opener,
          action: "Opened the conversation",
        });
      }
    }

    const messages = await listMessages(trap.ownerId, incident.id);

    return NextResponse.json({
      incidentId: incident.id,
      trap: {
        name: trap.name,
        template: trap.template,
        personaName: trap.config.personaName,
      },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        kind: m.kind,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Initialization failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

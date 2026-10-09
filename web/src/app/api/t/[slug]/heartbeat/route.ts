import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getIncidentBySessionKey,
  getTrapBySlug,
  updateIncident,
} from "@/lib/server/repo";

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

    const cookieStore = await cookies();
    const cookieName = `pv_att_${trap.id}`;
    const sessionKey = cookieStore.get(cookieName)?.value;

    if (!sessionKey) {
      return NextResponse.json({ ok: false, error: "No active session" }, { status: 200 });
    }

    const incident = await getIncidentBySessionKey(sessionKey, trap.id);
    if (!incident) {
      return NextResponse.json({ ok: false, error: "Incident not found" }, { status: 200 });
    }

    let body: { clientElapsedSeconds?: number; lastAction?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty on beacon
    }

    const now = new Date();
    const startedAt = new Date(incident.startedAt).getTime();
    const sessionDurationSeconds = Math.max(0, Math.floor((now.getTime() - startedAt) / 1000));

    // Measure time wasted as per the trap network session:
    // Takes the maximum of current time wasted, elapsed time since session start, or client-tracked active session seconds
    const newTimeWasted = Math.max(
      incident.timeWastedSeconds,
      sessionDurationSeconds,
      typeof body.clientElapsedSeconds === "number" ? body.clientElapsedSeconds : 0
    );

    await updateIncident(trap.ownerId, incident.id, {
      timeWastedSeconds: newTimeWasted,
      lastActivityAt: now.toISOString(),
      status: "active",
    });

    return NextResponse.json({
      ok: true,
      timeWastedSeconds: newTimeWasted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Heartbeat error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

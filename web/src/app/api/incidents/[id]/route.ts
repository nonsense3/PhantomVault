import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getIncidentById, getTrapById, listIncidentIocs, listMessages } from "@/lib/server/repo";

export async function GET(
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
    const messages = await listMessages(user.id, incident.id);
    const iocs = await listIncidentIocs(user.id, incident.id);

    return NextResponse.json({
      incident,
      trap,
      messages,
      iocs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

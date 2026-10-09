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

    const report = {
      report_type: "PHANTOM_VAULT_THREAT_INTELLIGENCE_INCIDENT_REPORT",
      version: "1.0",
      generated_at: new Date().toISOString(),
      report_id: `PV-REP-${incident.id.slice(0, 8).toUpperCase()}`,
      incident: {
        id: incident.id,
        status: incident.status,
        started_at: incident.startedAt,
        last_activity_at: incident.lastActivityAt,
        threat_level: incident.threatLevel,
        scam_classification: incident.scamType,
        time_wasted_seconds: incident.timeWastedSeconds,
        turns_completed: incident.turns,
        summary: incident.summary,
      },
      adversary_technical_data: {
        source_ip: incident.sourceIp,
        geolocation: incident.geo,
        user_agent: incident.userAgent,
      },
      indicators_of_compromise: iocs.map((ioc) => ({
        type: ioc.type,
        value: ioc.value,
        confidence_score: ioc.confidence,
        first_observed: ioc.firstSeen,
        last_observed: ioc.lastSeen,
        occurrence_count: ioc.occurrences,
      })),
      decoy_configuration: {
        trap_name: trap?.name || "Digital Decoy",
        template: trap?.template || "forward_scam",
        persona_archetype: trap?.persona || "gullible_senior",
        gullibility_index: trap?.gullibility ?? 50,
      },
      evidence_transcript: messages.map((m) => ({
        timestamp: m.createdAt,
        sender_role: m.role,
        message_kind: m.kind,
        content: m.content,
        mitigation_action: m.action || null,
      })),
      compliance_notes: "This report contains passively captured threat intelligence gathered via an active honeypot/decoy interaction. All financial secrets or credentials supplied by the decoy persona are non-functional test tokens designed to neutralize attacker progress.",
    };

    return new NextResponse(JSON.stringify(report, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="threat-incident-${incident.id.slice(0, 8)}.json"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

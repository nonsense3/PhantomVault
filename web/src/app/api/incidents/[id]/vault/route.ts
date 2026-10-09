import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import {
  getIncidentById,
  getTrapById,
  listIncidentIocs,
  listMessages,
  updateIncident,
} from "@/lib/server/repo";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required to vault evidence to Supabase Cloud",
          authenticated: false,
        },
        { status: 401 }
      );
    }

    const { id } = await props.params;
    const incident = await getIncidentById(user.id, id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const trap = await getTrapById(user.id, incident.trapId);
    const messages = await listMessages(user.id, incident.id);
    const iocs = await listIncidentIocs(user.id, incident.id);

    const reportId = `PV-VAULT-${incident.id.slice(0, 8).toUpperCase()}`;
    const evidencePackage = {
      report_type: "PHANTOM_VAULT_THREAT_INTELLIGENCE_INCIDENT_REPORT",
      version: "1.0",
      vaulted_at: new Date().toISOString(),
      report_id: reportId,
      incident: {
        id: incident.id,
        status: incident.status,
        started_at: incident.startedAt,
        last_activity_at: incident.lastActivityAt,
        threat_level: incident.threatLevel,
        scam_classification: incident.scamType,
        time_wasted_seconds: incident.timeWastedSeconds,
        turns_completed: messages.length,
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
        action: m.action,
      })),
    };

    // Update incident in Supabase indicating evidence has been vaulted to cloud
    await updateIncident(user.id, incident.id, {
      summary: `[VAULTED TO CLOUD: ${reportId}] ${incident.summary || "Forensic evidence package archived to Supabase Cloud."}`,
    });

    // Also persist into analyses table as a vaulted forensic dossier
    try {
      const admin = getSupabaseAdmin();
      if (admin) {
        await admin.from("analyses").insert({
          owner_id: user.id,
          input_type: "text",
          result: {
            threat_level: incident.threatLevel || "High",
            scam_type: incident.scamType || "Incoming Interaction",
            summary: `Cloud Vault Evidence Package for ${incident.sourceIp} (${reportId})`,
            red_flags: [
              `Attacker IP: ${incident.sourceIp}`,
              `${iocs.length} Indicators of Compromise recorded`,
              `${messages.length} transmission turns archived`,
              `Time wasted: ${incident.timeWastedSeconds} seconds`,
            ],
            iocs: iocs.map((i) => ({ type: i.type, value: i.value, confidence: i.confidence })),
            suggested_persona: trap?.persona || "gullible_senior",
            suggested_template: trap?.template || "forward_scam",
            suggested_opener: "Archive package",
            evidence_dossier: evidencePackage,
            evidenceDossier: evidencePackage,
          },
        });
      }
    } catch (dossierErr) {
      console.warn("Evidence dossier archive notice:", dossierErr);
    }

    return NextResponse.json({
      success: true,
      reportId,
      vaultedAt: evidencePackage.vaulted_at,
      evidencePackage,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to vault evidence";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

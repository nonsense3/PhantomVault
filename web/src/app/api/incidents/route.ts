import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDashboardStats, listAnalyses, listIncidents, listTraps } from "@/lib/server/repo";

export async function GET() {
  try {
    const user = await requireUser();
    const incidents = await listIncidents(user.id);
    const stats = await getDashboardStats(user.id);
    const traps = await listTraps(user.id);
    const analyses = await listAnalyses(user.id);

    const trapMap = new Map(traps.map((t) => [t.id, t.name]));

    const vaultedReports: Array<{
      id: string;
      reportId: string;
      incidentId: string;
      vaultedAt: string;
      scamType: string;
      threatLevel: string;
      summary: string;
      sourceIp: string;
      geo?: any;
      timeWastedSeconds: number;
      turns: number;
      trapName: string;
      evidencePackage?: any;
    }> = [];

    // 1. Collect from analyses that contain evidence_dossier
    for (const a of analyses) {
      const res = a.result as any;
      const dossier = res?.evidence_dossier || res?.evidenceDossier;
      if (dossier) {
        vaultedReports.push({
          id: a.id,
          reportId: dossier.report_id || `PV-VAULT-${a.id.slice(0, 8).toUpperCase()}`,
          incidentId: dossier.incident?.id || "",
          vaultedAt: dossier.vaulted_at || a.createdAt,
          threatLevel: res?.threat_level || res?.threatLevel || "High",
          scamType: res?.scam_type || res?.scamType || "Incoming Interaction",
          summary: res?.summary || a.inputPreview,
          sourceIp: dossier.adversary_technical_data?.source_ip || "Unknown IP",
          geo: dossier.adversary_technical_data?.geolocation || null,
          timeWastedSeconds: dossier.incident?.time_wasted_seconds || 0,
          turns: dossier.incident?.turns_completed || 0,
          trapName: dossier.decoy_configuration?.trap_name || "Digital Decoy",
          evidencePackage: dossier,
        });
      }
    }

    // 2. Also ensure every incident flagged with [VAULTED TO CLOUD] is accounted for
    for (const inc of incidents) {
      if (inc.summary?.includes("[VAULTED TO CLOUD")) {
        const match = inc.summary.match(/\[VAULTED TO CLOUD:\s*([^\]]+)\]/);
        const reportId = match ? match[1].trim() : `PV-VAULT-${inc.id.slice(0, 8).toUpperCase()}`;
        if (!vaultedReports.some((r) => r.incidentId === inc.id || r.reportId === reportId)) {
          vaultedReports.push({
            id: inc.id,
            reportId,
            incidentId: inc.id,
            vaultedAt: inc.lastActivityAt,
            threatLevel: inc.threatLevel || "High",
            scamType: inc.scamType || "Incoming Interaction",
            summary: inc.summary,
            sourceIp: inc.sourceIp,
            geo: inc.geo,
            timeWastedSeconds: inc.timeWastedSeconds,
            turns: inc.turns || 0,
            trapName: trapMap.get(inc.trapId) || "Decoy Target",
            evidencePackage: null,
          });
        }
      }
    }

    return NextResponse.json({
      incidents,
      stats,
      traps,
      vaultedReports,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

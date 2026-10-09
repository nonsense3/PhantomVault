import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { getDashboardStats, listIncidents, listTraps } from "@/lib/server/repo";

export async function GET() {
  try {
    const user = await requireUser();
    const incidents = await listIncidents(user.id);
    const stats = await getDashboardStats(user.id);
    const traps = await listTraps(user.id);

    return NextResponse.json({
      incidents,
      stats,
      traps,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

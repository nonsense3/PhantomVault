import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { createTrap, listTraps } from "@/lib/server/repo";

export async function GET() {
  try {
    const user = await requireUser();
    const traps = await listTraps(user.id);
    return NextResponse.json({ traps });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const {
      name,
      template,
      persona,
      gullibility,
      personaName,
      opener,
      scamType,
      sourceAnalysisId,
      portalBrand,
      decoyUsername,
      decoyPassword,
      decoyBalance,
      securityQuestion,
      lureHeadline,
    } = body;

    if (!name || !template || !persona) {
      return NextResponse.json({ error: "Missing required trap configuration" }, { status: 400 });
    }

    const trap = await createTrap(user.id, {
      name,
      template,
      persona,
      gullibility: typeof gullibility === "number" ? gullibility : 65,
      personaName,
      opener,
      scamType,
      sourceAnalysisId,
      portalBrand,
      decoyUsername,
      decoyPassword,
      decoyBalance,
      securityQuestion,
      lureHeadline,
    });

    return NextResponse.json({ trap }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create trap";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

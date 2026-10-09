import { NextResponse } from "next/server";
import { recordAbuseReport } from "@/lib/server/repo";

export async function POST(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await props.params;
    const body = await req.json();
    const { details, contact } = body;

    await recordAbuseReport(slug, details || "Unspecified abuse report", contact || null);

    return NextResponse.json({ ok: true, message: "Report received and logged for review." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid operator email address is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Determine public origin for redirect URL
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const origin = forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : new URL(req.url).origin;

    const redirectTo = `${origin}/auth/callback?next=/reset-password`;

    const admin = getSupabaseAdmin();
    if (admin) {
      const { error } = await admin.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        console.warn("[forgot-password] resetPasswordForEmail warning:", error.message);
        // We still return 200 for security reasons (avoid account enumeration), but can log error
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If an operator account exists with this email, a secure password reset link has been dispatched.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process password recovery request";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

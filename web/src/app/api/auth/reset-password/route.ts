import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { createServerSupabaseClient } from "@/lib/server/supabase-server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required or recovery session expired. Please request a new link." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    if (admin) {
      const { error: adminErr } = await admin.auth.admin.updateUserById(user.id, {
        password,
      });
      if (adminErr) {
        throw new Error(adminErr.message);
      }
    }

    // Also update active session
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.updateUser({ password });
    } catch (e) {
      console.warn("[reset-password] session updateUser warning:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Operator password updated successfully",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset password";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

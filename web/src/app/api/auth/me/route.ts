import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { displayName } = body;
    if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
      return NextResponse.json({ error: "Operator name cannot be empty" }, { status: 400 });
    }

    const cleanName = displayName.trim();

    // 1. Update database profile & Supabase admin auth metadata
    const { updateProfile } = await import("@/lib/server/repo");
    const updated = await updateProfile(user.id, { displayName: cleanName });

    // 2. Also refresh session cookie with new display name
    try {
      const { createServerSupabaseClient } = await import("@/lib/server/supabase-server");
      const supabase = await createServerSupabaseClient();
      await supabase.auth.updateUser({
        data: {
          display_name: cleanName,
          full_name: cleanName,
          name: cleanName,
        },
      });
    } catch (cookieErr) {
      console.warn("[api:auth:me] Could not refresh session cookie:", cookieErr);
    }

    return NextResponse.json({
      user: {
        id: updated?.id || user.id,
        email: updated?.email || user.email,
        displayName: updated?.displayName || cleanName,
        createdAt: updated?.createdAt || user.createdAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deleteUserAccount } = await import("@/lib/server/repo");
    await deleteUserAccount(user.id);

    const { logoutUser } = await import("@/lib/server/auth");
    await logoutUser();

    return NextResponse.json({
      success: true,
      message: "Operator account and all associated telemetry permanently decommissioned",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete account";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


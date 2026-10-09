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

    const { updateProfile } = await import("@/lib/server/repo");
    const updated = await updateProfile(user.id, { displayName: displayName.trim() });

    return NextResponse.json({
      user: {
        id: updated?.id || user.id,
        email: updated?.email || user.email,
        displayName: updated?.displayName || displayName.trim(),
        createdAt: updated?.createdAt || user.createdAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

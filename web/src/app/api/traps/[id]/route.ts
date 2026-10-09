import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { deleteTrap, getTrapById, updateTrap } from "@/lib/server/repo";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;
    const trap = await getTrapById(user.id, id);
    if (!trap) {
      return NextResponse.json({ error: "Trap not found" }, { status: 404 });
    }
    return NextResponse.json({ trap });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;
    const body = await req.json();

    const updated = await updateTrap(user.id, id, body);
    if (!updated) {
      return NextResponse.json({ error: "Trap not found" }, { status: 404 });
    }
    return NextResponse.json({ trap: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update trap";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await props.params;

    const ok = await deleteTrap(user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Trap not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete trap";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

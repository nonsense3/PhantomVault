import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { listIocs } from "@/lib/server/repo";
import type { IocType } from "@/lib/types";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get("type") as IocType | null;
    const query = url.searchParams.get("q")?.toLowerCase();

    let iocs = await listIocs(user.id);

    if (typeFilter) {
      iocs = iocs.filter((i) => i.type === typeFilter);
    }

    if (query) {
      iocs = iocs.filter((i) => i.value.toLowerCase().includes(query));
    }

    return NextResponse.json({ iocs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server/supabase-server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Upsert profile record
      const admin = getSupabaseAdmin();
      if (admin) {
        const displayName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.user_metadata?.user_name ||
          data.user.email?.split("@")[0] ||
          "Security Lead";

        await admin.from("profiles").upsert(
          {
            id: data.user.id,
            display_name: displayName,
            avatar_url: data.user.user_metadata?.avatar_url || null,
          },
          { onConflict: "id" }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}

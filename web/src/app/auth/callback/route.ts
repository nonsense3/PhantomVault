import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server/supabase-server";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : new URL(request.url).origin;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Upsert profile record
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data: existingProfile } = await admin
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();

        const displayName =
          existingProfile?.display_name ||
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.user_metadata?.user_name ||
          data.user.email?.split("@")[0] ||
          "Security Lead";

        const avatarUrl =
          data.user.user_metadata?.avatar_url ||
          data.user.user_metadata?.picture ||
          data.user.identities?.[0]?.identity_data?.avatar_url ||
          data.user.identities?.[0]?.identity_data?.picture ||
          null;

        await admin.from("profiles").upsert(
          {
            id: data.user.id,
            display_name: displayName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" }
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}

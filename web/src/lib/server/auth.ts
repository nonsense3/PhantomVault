import "server-only";
import { createServerSupabaseClient } from "./supabase-server";
import { getSupabaseAdmin } from "./supabase";
import type { UserRecord } from "./store";

export async function getCurrentUser(): Promise<UserRecord | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    let displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Security Lead";

    let avatarUrl =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      user.identities?.[0]?.identity_data?.avatar_url ||
      user.identities?.[0]?.identity_data?.picture ||
      undefined;

    const admin = getSupabaseAdmin();
    if (admin) {
      const { data: profile } = await admin
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name;
      }
      if (profile?.avatar_url) {
        avatarUrl = profile.avatar_url;
      } else if (avatarUrl) {
        try {
          await admin
            .from("profiles")
            .upsert(
              { id: user.id, display_name: displayName, avatar_url: avatarUrl },
              { onConflict: "id" }
            );
        } catch (syncErr) {
          console.warn("[auth:getCurrentUser] profile avatar sync warning:", syncErr);
        }
      }
    }

    return {
      id: user.id,
      email: user.email || "",
      displayName,
      avatarUrl: avatarUrl || undefined,
      createdAt: user.created_at,
    };
  } catch (err) {
    console.warn("[auth:getCurrentUser] session check failed:", err);
    return null;
  }
}

export async function requireUser(): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserRecord; token: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Invalid email or password");
  }

  const u = data.user;
  let displayName =
    u.user_metadata?.display_name ||
    u.user_metadata?.full_name ||
    u.email?.split("@")[0] ||
    "Security Lead";

  // Ensure profile row exists without overwriting custom display names
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", u.id)
      .maybeSingle();

    if (profile?.display_name) {
      displayName = profile.display_name;
    } else {
      await admin.from("profiles").upsert(
        {
          id: u.id,
          display_name: displayName,
        },
        { onConflict: "id" }
      );
    }
  }

  return {
    user: {
      id: u.id,
      email: u.email || "",
      displayName,
      createdAt: u.created_at,
    },
    token: data.session?.access_token || "",
  };
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: UserRecord; token: string }> {
  if (!email || !password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = displayName.trim() || cleanEmail.split("@")[0];

  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase is not configured");
  }

  // Create user directly with email pre-confirmed for seamless experience
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: cleanName,
    },
  });

  if (createErr || !created?.user) {
    if (createErr?.message.toLowerCase().includes("already registered") || createErr?.message.toLowerCase().includes("unique")) {
      throw new Error("An account with this email already exists");
    }
    throw new Error(createErr?.message || "Failed to register account");
  }

  // Upsert profile in public.profiles table
  await admin.from("profiles").upsert(
    {
      id: created.user.id,
      display_name: cleanName,
    },
    { onConflict: "id" }
  );

  // Now sign in to establish session cookies via SSR
  const supabase = await createServerSupabaseClient();
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (signErr || !signData?.user) {
    return {
      user: {
        id: created.user.id,
        email: cleanEmail,
        displayName: cleanName,
        createdAt: created.user.created_at,
      },
      token: "",
    };
  }

  return {
    user: {
      id: signData.user.id,
      email: cleanEmail,
      displayName: cleanName,
      createdAt: signData.user.created_at,
    },
    token: signData.session?.access_token || "",
  };
}

export async function logoutUser(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("[auth:logoutUser] error:", err);
  }
}

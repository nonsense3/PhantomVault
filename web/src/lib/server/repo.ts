import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type {
  Analysis,
  AnalysisResult,
  DashboardStats,
  Incident,
  Ioc,
  IocType,
  Message,
  PersonaId,
  TemplateId,
  Trap,
  TrapStatus,
  TrapWithStats,
} from "@/lib/types";
import { env } from "@/lib/server/env";
import { getSupabaseAdmin } from "./supabase";
import { emit, type IncidentRecord, type UserRecord } from "./store";

/* ------------------------------------------------------------------------- */
/* Mappers                                                                   */
/* ------------------------------------------------------------------------- */

function mapTrap(row: any): Trap {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    template: row.template,
    slug: row.slug,
    persona: row.persona,
    gullibility: row.gullibility ?? 65,
    status: row.status as TrapStatus,
    config: row.config || {},
    createdAt: row.created_at,
  };
}

function mapIncident(row: any): Incident {
  return {
    id: row.id,
    trapId: row.trap_id,
    ownerId: row.owner_id,
    sourceIp: row.source_ip || "Unknown IP",
    geo: row.geo || null,
    userAgent: row.user_agent || "",
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
    status: row.status,
    scamType: row.scam_type || "Incoming Interaction",
    threatLevel: row.threat_level || "High",
    timeWastedSeconds: row.time_wasted_seconds || 0,
    summary: row.summary || "",
    simulated: false,
    turns: 0,
  };
}

function mapMessage(row: any): Message {
  return {
    id: row.id,
    incidentId: row.incident_id,
    ownerId: row.owner_id,
    role: row.role,
    content: row.content,
    kind: row.kind || "text",
    action: row.action || undefined,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
  };
}

function mapIoc(row: any): Ioc {
  return {
    id: row.id,
    incidentId: row.incident_id,
    ownerId: row.owner_id,
    type: row.type as IocType,
    value: row.value,
    confidence: typeof row.confidence === "number" ? row.confidence : parseFloat(row.confidence) || 0.9,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    occurrences: row.occurrences || 1,
  };
}

function mapAnalysis(row: any): Analysis {
  return {
    id: row.id,
    ownerId: row.owner_id,
    inputType: row.input_type,
    inputPreview: typeof row.result?.summary === "string" ? row.result.summary.slice(0, 300) : "Threat Analysis",
    hasImage: row.input_type === "image" || !!row.storage_path,
    result: row.result,
    convertedTrapId: row.converted_trap_id,
    createdAt: row.created_at,
  };
}

/* ------------------------------------------------------------------------- */
/* Users & Profiles                                                          */
/* ------------------------------------------------------------------------- */

export async function getUserById(id: string): Promise<UserRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const { data: authUser } = await admin.auth.admin.getUserById(id);

  if (!authUser?.user && !profile) return null;

  const email = authUser?.user?.email || "";
  const displayName =
    profile?.display_name ||
    authUser?.user?.user_metadata?.display_name ||
    email.split("@")[0] ||
    "Security Lead";

  return {
    id,
    email,
    displayName,
    createdAt: profile?.created_at || authUser?.user?.created_at || new Date().toISOString(),
  };
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin.auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase().trim());
  if (!user) return null;

  return getUserById(user.id);
}

export async function updateProfile(
  userId: string,
  updates: { displayName?: string }
): Promise<UserRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  if (updates.displayName !== undefined) {
    const cleanName = updates.displayName.trim();
    const { error: pErr } = await admin
      .from("profiles")
      .upsert(
        { id: userId, display_name: cleanName },
        { onConflict: "id" }
      );
    if (pErr) {
      console.error("[repo:updateProfile] profiles upsert error:", pErr);
    }

    try {
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: {
          display_name: cleanName,
          full_name: cleanName,
          name: cleanName,
        },
      });
    } catch (authErr) {
      console.warn("[repo:updateProfile] auth metadata update warning:", authErr);
    }
  }

  return getUserById(userId);
}

export async function deleteUserAccount(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error("Supabase administration client unavailable");
  }

  // 1. Explicitly purge dependent rows in child tables (failsafe alongside Postgres CASCADE)
  try {
    await admin.from("iocs").delete().eq("owner_id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] iocs purge warning:", err);
  }

  try {
    await admin.from("messages").delete().eq("owner_id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] messages purge warning:", err);
  }

  try {
    await admin.from("analyses").delete().eq("owner_id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] analyses purge warning:", err);
  }

  try {
    await admin.from("incidents").delete().eq("owner_id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] incidents purge warning:", err);
  }

  try {
    await admin.from("traps").delete().eq("owner_id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] traps purge warning:", err);
  }

  try {
    await admin.from("profiles").delete().eq("id", userId);
  } catch (err) {
    console.warn("[repo:deleteUserAccount] profiles purge warning:", err);
  }

  // 2. Permanently delete user from Supabase auth.users
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[repo:deleteUserAccount] auth admin deleteUser error:", error);
    throw new Error(error.message || "Failed to permanently decommission operator account");
  }

  return true;
}


/* ------------------------------------------------------------------------- */
/* Traps                                                                     */
/* ------------------------------------------------------------------------- */

export async function listTraps(ownerId: string): Promise<TrapWithStats[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: traps, error } = await admin
    .from("traps")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error || !traps) return [];

  const { data: incidents } = await admin
    .from("incidents")
    .select("id, trap_id, time_wasted_seconds, last_activity_at")
    .eq("owner_id", ownerId);

  return traps.map((t) => {
    const trap = mapTrap(t);
    const trapIncidents = (incidents || []).filter((i) => i.trap_id === trap.id);
    const timeWasted = trapIncidents.reduce((acc, i) => acc + (i.time_wasted_seconds || 0), 0);
    const lastActive = trapIncidents.reduce<string | null>((latest, i) => {
      if (!latest || (i.last_activity_at && i.last_activity_at > latest)) return i.last_activity_at;
      return latest;
    }, null);

    return {
      ...trap,
      incidentCount: trapIncidents.length,
      timeWastedSeconds: timeWasted,
      lastActivityAt: lastActive,
    };
  });
}

export async function getTrapById(ownerId: string, trapId: string): Promise<Trap | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("traps")
    .select("*")
    .eq("id", trapId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  return data ? mapTrap(data) : null;
}

export async function getTrapBySlug(slug: string): Promise<Trap | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("traps")
    .select("*")
    .eq("slug", slug.toLowerCase().trim())
    .maybeSingle();

  return data ? mapTrap(data) : null;
}

export async function createTrap(
  ownerId: string,
  params: {
    name: string;
    template: TemplateId;
    persona: PersonaId;
    gullibility: number;
    personaName?: string;
    opener?: string;
    scamType?: string;
    sourceAnalysisId?: string;
    portalBrand?: string;
    decoyUsername?: string;
    decoyPassword?: string;
    decoyBalance?: string;
    securityQuestion?: string;
    lureHeadline?: string;
  }
): Promise<Trap> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not connected");

  // Check trap limit
  const { count } = await admin
    .from("traps")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId);

  if ((count || 0) >= env().MAX_TRAPS_PER_USER) {
    throw new Error(`Trap creation limit reached (${env().MAX_TRAPS_PER_USER})`);
  }

  // Generate unique slug
  const baseSlug =
    params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "trap";
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;

  const row = {
    id: randomUUID(),
    owner_id: ownerId,
    name: params.name.trim(),
    template: params.template,
    slug,
    persona: params.persona,
    gullibility: Math.max(0, Math.min(100, params.gullibility)),
    status: "active",
    config: {
      personaName:
        params.personaName ||
        (params.persona === "gullible_senior"
          ? "Margaret Hollis"
          : params.persona === "angry_executive"
          ? "Richard Vance"
          : "Jamie Okafor"),
      opener: params.opener,
      scamType: params.scamType,
      sourceAnalysisId: params.sourceAnalysisId,
      portalBrand: params.portalBrand?.trim() || (params.template === "fake_login" ? "Northwind Secure Bank" : undefined),
      decoyUsername: params.decoyUsername?.trim() || undefined,
      decoyPassword: params.decoyPassword?.trim() || undefined,
      decoyBalance: params.decoyBalance?.trim() || (params.template === "fake_login" ? "£14,892.40" : undefined),
      securityQuestion: params.securityQuestion?.trim() || undefined,
      lureHeadline: params.lureHeadline?.trim() || undefined,
    },
    created_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("traps").insert(row).select().single();
  if (error || !data) {
    throw new Error(error?.message || "Failed to create trap");
  }

  const trap = mapTrap(data);
  emit(ownerId, { type: "trap.updated", trap });
  return trap;
}

export async function updateTrap(
  ownerId: string,
  trapId: string,
  updates: Partial<Pick<Trap, "name" | "status" | "persona" | "gullibility" | "config">>
): Promise<Trap | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const current = await getTrapById(ownerId, trapId);
  if (!current) return null;

  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name.trim();
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.persona !== undefined) patch.persona = updates.persona;
  if (updates.gullibility !== undefined) patch.gullibility = Math.max(0, Math.min(100, updates.gullibility));
  if (updates.config !== undefined) patch.config = { ...current.config, ...updates.config };

  const { data, error } = await admin
    .from("traps")
    .update(patch)
    .eq("id", trapId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error || !data) return null;

  const trap = mapTrap(data);
  emit(ownerId, { type: "trap.updated", trap });
  return trap;
}

export async function deleteTrap(ownerId: string, trapId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { error } = await admin
    .from("traps")
    .delete()
    .eq("id", trapId)
    .eq("owner_id", ownerId);

  if (error) return false;

  emit(ownerId, { type: "trap.deleted", trapId });
  return true;
}

/* ------------------------------------------------------------------------- */
/* Incidents                                                                 */
/* ------------------------------------------------------------------------- */

export async function listIncidents(ownerId: string): Promise<Incident[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("incidents")
    .select("*")
    .eq("owner_id", ownerId)
    .order("last_activity_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapIncident);
}

export async function getIncidentById(ownerId: string, incidentId: string): Promise<Incident | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  return data ? mapIncident(data) : null;
}

export async function getIncidentBySessionKey(
  sessionKey: string,
  trapId: string
): Promise<IncidentRecord | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("incidents")
    .select("*")
    .eq("id", sessionKey)
    .eq("trap_id", trapId)
    .maybeSingle();

  if (!data) return null;

  return {
    ...mapIncident(data),
    sessionKey: data.id,
  };
}

export async function createIncident(params: {
  trapId: string;
  ownerId: string;
  sourceIp: string;
  userAgent: string;
  geo?: { country?: string; city?: string } | null;
  scamType?: string | null;
  threatLevel?: Incident["threatLevel"];
  simulated?: boolean;
}): Promise<IncidentRecord> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not connected");

  const now = new Date().toISOString();
  const id = randomUUID();

  const row = {
    id,
    trap_id: params.trapId,
    owner_id: params.ownerId,
    source_ip: params.sourceIp,
    geo: params.geo || null,
    user_agent: params.userAgent,
    started_at: now,
    last_activity_at: now,
    status: "active",
    scam_type: params.scamType || "Incoming Interaction",
    threat_level: params.threatLevel || "High",
    time_wasted_seconds: 0,
    summary: "Active decoy engagement",
    created_at: now,
  };

  const { data, error } = await admin.from("incidents").insert(row).select().single();
  if (error || !data) {
    throw new Error(error?.message || "Failed to create incident");
  }

  const incident = mapIncident(data);
  const incidentRecord: IncidentRecord = {
    ...incident,
    sessionKey: id,
  };

  const { data: trapRow } = await admin.from("traps").select("name").eq("id", params.trapId).maybeSingle();
  emit(params.ownerId, {
    type: "incident.created",
    incident,
    trapName: trapRow?.name || "Active Decoy",
  });

  return incidentRecord;
}

export async function updateIncident(
  ownerId: string,
  incidentId: string,
  updates: Partial<Pick<Incident, "status" | "timeWastedSeconds" | "summary" | "lastActivityAt" | "scamType" | "threatLevel">>
): Promise<Incident | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.timeWastedSeconds !== undefined) patch.time_wasted_seconds = updates.timeWastedSeconds;
  if (updates.summary !== undefined) patch.summary = updates.summary;
  if (updates.lastActivityAt !== undefined) patch.last_activity_at = updates.lastActivityAt;
  if (updates.scamType !== undefined) patch.scam_type = updates.scamType;
  if (updates.threatLevel !== undefined) patch.threat_level = updates.threatLevel;

  const { data, error } = await admin
    .from("incidents")
    .update(patch)
    .eq("id", incidentId)
    .eq("owner_id", ownerId)
    .select()
    .single();

  if (error || !data) return null;

  const inc = mapIncident(data);
  emit(ownerId, { type: "incident.updated", incident: inc });
  return inc;
}

/* ------------------------------------------------------------------------- */
/* Messages                                                                  */
/* ------------------------------------------------------------------------- */

export async function listMessages(ownerId: string, incidentId: string): Promise<Message[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("messages")
    .select("*")
    .eq("incident_id", incidentId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapMessage);
}

export async function createMessage(params: {
  incidentId: string;
  ownerId: string;
  role: Message["role"];
  content: string;
  kind?: Message["kind"];
  action?: string;
  metadata?: Record<string, unknown>;
}): Promise<Message> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not connected");

  const id = randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    incident_id: params.incidentId,
    owner_id: params.ownerId,
    role: params.role,
    content: params.content,
    kind: params.kind || "text",
    action: params.action || null,
    metadata: params.metadata || {},
    created_at: now,
  };

  const { data, error } = await admin.from("messages").insert(row).select().single();
  if (error || !data) {
    throw new Error(error?.message || "Failed to create message");
  }

  // Update incident last_activity_at and time_wasted_seconds based on trap session
  const { data: inc } = await admin
    .from("incidents")
    .select("time_wasted_seconds, trap_id, started_at")
    .eq("id", params.incidentId)
    .maybeSingle();

  const attackerStepBonus = params.role === "attacker" ? Math.floor(20 + Math.random() * 15) : 0;
  const updatedTime = (inc?.time_wasted_seconds || 0) + attackerStepBonus;

  await admin
    .from("incidents")
    .update({
      last_activity_at: now,
      time_wasted_seconds: updatedTime,
    })
    .eq("id", params.incidentId);

  const msg = mapMessage(data);

  let trapName = "Trap";
  if (inc?.trap_id) {
    const { data: trapRow } = await admin.from("traps").select("name").eq("id", inc.trap_id).maybeSingle();
    if (trapRow?.name) trapName = trapRow.name;
  }

  emit(params.ownerId, {
    type: "message.created",
    message: msg,
    trapName,
  });

  return msg;
}

/* ------------------------------------------------------------------------- */
/* IoCs                                                                      */
/* ------------------------------------------------------------------------- */

export async function listIocs(ownerId: string): Promise<Ioc[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("iocs")
    .select("*")
    .eq("owner_id", ownerId)
    .order("last_seen", { ascending: false });

  if (error || !data) return [];
  return data.map(mapIoc);
}

export async function listIncidentIocs(ownerId: string, incidentId: string): Promise<Ioc[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("iocs")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("incident_id", incidentId)
    .order("last_seen", { ascending: false });

  if (error || !data) return [];
  return data.map(mapIoc);
}

export async function upsertIoc(params: {
  incidentId: string;
  ownerId: string;
  type: IocType;
  value: string;
  confidence: number;
}): Promise<Ioc> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not connected");

  const normValue = params.value.trim();
  const now = new Date().toISOString();

  // Check if this IoC already exists for this owner
  const { data: existing } = await admin
    .from("iocs")
    .select("*")
    .eq("owner_id", params.ownerId)
    .eq("type", params.type)
    .eq("value", normValue)
    .maybeSingle();

  if (existing) {
    const nextOccurrences = (existing.occurrences || 1) + 1;
    const nextConfidence = Math.max(Number(existing.confidence) || 0, params.confidence);

    const { data: updated } = await admin
      .from("iocs")
      .update({
        occurrences: nextOccurrences,
        last_seen: now,
        confidence: nextConfidence,
      })
      .eq("id", existing.id)
      .select()
      .single();

    const ioc = mapIoc(updated || existing);
    emit(params.ownerId, { type: "ioc.upserted", ioc });
    return ioc;
  }

  const row = {
    id: randomUUID(),
    incident_id: params.incidentId,
    owner_id: params.ownerId,
    type: params.type,
    value: normValue,
    confidence: params.confidence,
    first_seen: now,
    last_seen: now,
    occurrences: 1,
    created_at: now,
  };

  const { data: created, error } = await admin.from("iocs").insert(row).select().single();
  if (error || !created) {
    throw new Error(error?.message || "Failed to insert IoC");
  }

  const ioc = mapIoc(created);
  emit(params.ownerId, { type: "ioc.upserted", ioc });
  return ioc;
}

/* ------------------------------------------------------------------------- */
/* Analyses                                                                  */
/* ------------------------------------------------------------------------- */

export async function listAnalyses(ownerId: string): Promise<Analysis[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("analyses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapAnalysis);
}

export async function getAnalysisById(ownerId: string, id: string): Promise<Analysis | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("analyses")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  return data ? mapAnalysis(data) : null;
}

export async function createAnalysis(params: {
  ownerId: string;
  inputType: Analysis["inputType"];
  inputPreview: string;
  hasImage: boolean;
  result: AnalysisResult;
}): Promise<Analysis> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Database not connected");

  const row = {
    id: randomUUID(),
    owner_id: params.ownerId,
    input_type: params.inputType,
    storage_path: null,
    result: params.result,
    converted_trap_id: null,
    created_at: new Date().toISOString(),
  };

  let { data, error } = await admin.from("analyses").insert(row).select().single();
  if (error && (error.message?.includes("input_type") || error.code === "23514")) {
    // If the database has an older check constraint (image, text, url), fallback to 'text'
    row.input_type = "text";
    const retry = await admin.from("analyses").insert(row).select().single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data) {
    throw new Error(error?.message || "Failed to save analysis");
  }

  return mapAnalysis(data);

}

export async function markAnalysisConverted(ownerId: string, analysisId: string, trapId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin
    .from("analyses")
    .update({ converted_trap_id: trapId })
    .eq("id", analysisId)
    .eq("owner_id", ownerId);
}

/* ------------------------------------------------------------------------- */
/* Dashboard Summary Stats                                                   */
/* ------------------------------------------------------------------------- */

export async function getDashboardStats(ownerId: string): Promise<DashboardStats> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      activeTraps: 0,
      totalTraps: 0,
      scammersTrapped: 0,
      timeWastedSeconds: 0,
      iocCount: 0,
      activeIncidents: 0,
    };
  }

  const [trapsRes, incidentsRes, iocsRes] = await Promise.all([
    admin.from("traps").select("id, status").eq("owner_id", ownerId),
    admin.from("incidents").select("id, status, time_wasted_seconds").eq("owner_id", ownerId),
    admin.from("iocs").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
  ]);

  const traps = trapsRes.data || [];
  const incidents = incidentsRes.data || [];
  const iocCount = iocsRes.count || 0;

  const activeTraps = traps.filter((t) => t.status === "active").length;
  const activeIncidents = incidents.filter((i) => i.status === "active").length;
  const timeWastedSeconds = incidents.reduce((sum, inc) => sum + (inc.time_wasted_seconds || 0), 0);

  return {
    activeTraps,
    totalTraps: traps.length,
    scammersTrapped: incidents.length,
    timeWastedSeconds,
    iocCount,
    activeIncidents,
  };
}

/* ------------------------------------------------------------------------- */
/* Abuse Reporting                                                           */
/* ------------------------------------------------------------------------- */

export async function recordAbuseReport(slug: string | null, details: string, contact: string | null): Promise<void> {
  console.log("[Abuse Report Logged]", { slug, details: details.slice(0, 500), contact, timestamp: new Date().toISOString() });
}

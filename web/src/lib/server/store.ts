import "server-only";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import type { Analysis, Incident, Ioc, LiveEvent, Message, Trap } from "@/lib/types";

/**
 * Built-in persistence for the self-contained mode.
 *
 * Data lives in memory and is flushed to `web/.data/db.json` (git-ignored).
 * Every read and write goes through `repo.ts`, which scopes access by owner, the
 * same contract the hosted Postgres + row-level-security backend enforces. Swapping
 * the backend only means re-implementing `repo.ts`.
 */

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string;
  salt?: string;
  createdAt: string;
}

export interface IncidentRecord extends Incident {
  /** Opaque token stored in the attacker's browser so a conversation can continue. */
  sessionKey: string;
}

export interface AbuseReport {
  id: string;
  slug: string | null;
  details: string;
  contact: string | null;
  createdAt: string;
}

export interface DbShape {
  version: 1;
  seeded: boolean;
  users: UserRecord[];
  traps: Trap[];
  incidents: IncidentRecord[];
  messages: Message[];
  iocs: Ioc[];
  analyses: Analysis[];
  abuseReports: AbuseReport[];
}

interface StoreState {
  db: DbShape;
  emitter: EventEmitter;
  saveTimer: NodeJS.Timeout | null;
  file: string;
}

const g = globalThis as unknown as { __pvStore?: StoreState };

function emptyDb(): DbShape {
  return {
    version: 1,
    seeded: false,
    users: [],
    traps: [],
    incidents: [],
    messages: [],
    iocs: [],
    analyses: [],
    abuseReports: [],
  };
}

function load(): StoreState {
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "db.json");
  let db = emptyDb();
  try {
    if (fs.existsSync(file)) {
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<DbShape>;
      db = { ...emptyDb(), ...raw, version: 1 };
    }
  } catch (err) {
    console.error("[store] could not read data file, starting fresh", err);
    db = emptyDb();
  }
  const emitter = new EventEmitter();
  emitter.setMaxListeners(500);
  return { db, emitter, saveTimer: null, file };
}

function state(): StoreState {
  if (!g.__pvStore) g.__pvStore = load();
  return g.__pvStore;
}

export function db(): DbShape {
  return state().db;
}

/** Debounced, atomic flush to disk. */
export function persist(): void {
  const s = state();
  if (s.saveTimer) return;
  s.saveTimer = setTimeout(() => {
    s.saveTimer = null;
    try {
      fs.mkdirSync(path.dirname(s.file), { recursive: true });
      const tmp = `${s.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(s.db));
      fs.renameSync(tmp, s.file);
    } catch (err) {
      console.error("[store] failed to write data file", err);
    }
  }, 250);
}

export function emit(ownerId: string, event: LiveEvent): void {
  state().emitter.emit(`owner:${ownerId}`, event);
}

export function subscribe(ownerId: string, fn: (e: LiveEvent) => void): () => void {
  const key = `owner:${ownerId}`;
  const em = state().emitter;
  em.on(key, fn);
  return () => em.off(key, fn);
}

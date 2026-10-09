import "server-only";
import { z } from "zod";

/**
 * Single validated source of server configuration (PRD 14.1 step 5).
 * Values come from `web/.env`. A malformed value stops the server at startup
 * (see src/instrumentation.ts) instead of failing later at request time.
 */
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Signs session cookies. Must be long and random.
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),

    // AI provider: auto picks the hosted model when a key exists, else the built-in engine.
    AI_PROVIDER: z.enum(["auto", "local", "gemma", "service"]).default("auto"),
    GEMMA_API_KEY: optionalString,
    GEMMA_MODEL: z.string().trim().min(1).default("gemma-4-31b-it"),
    GEMMA_API_BASE: z
      .string()
      .trim()
      .url()
      .default("https://generativelanguage.googleapis.com/v1beta"),
    AI_TIMEOUT_MS: z.coerce.number().int().min(2000).max(120000).default(25000),

    // Optional external AI service (the Python service from the PRD).
    AI_SERVICE_URL: optionalString.pipe(z.string().url().optional()),
    INTERNAL_SERVICE_SECRET: optionalString.pipe(z.string().min(32).optional()),

    // Reserved for the hosted database backend (not used by the built-in store).
    NEXT_PUBLIC_SUPABASE_URL: optionalString,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,
    SUPABASE_JWT_SECRET: optionalString,

    DATA_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    SEED_DEMO_DATA: z
      .enum(["true", "false"])
      .default("true")
      .transform((v) => v === "true"),
    MAX_TURNS_PER_INCIDENT: z.coerce.number().int().min(4).max(200).default(40),
    MAX_TRAPS_PER_USER: z.coerce.number().int().min(1).max(500).default(25),
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "gemma" && !env.GEMMA_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["GEMMA_API_KEY"], message: "required when AI_PROVIDER=gemma" });
    }
    if (env.AI_PROVIDER === "service") {
      if (!env.AI_SERVICE_URL)
        ctx.addIssue({ code: "custom", path: ["AI_SERVICE_URL"], message: "required when AI_PROVIDER=service" });
      if (!env.INTERNAL_SERVICE_SECRET)
        ctx.addIssue({
          code: "custom",
          path: ["INTERNAL_SERVICE_SECRET"],
          message: "required when AI_PROVIDER=service",
        });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server configuration in .env:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Which engine actually answers: resolves `auto`. */
export function resolvedAiProvider(): "local" | "gemma" | "service" {
  const e = env();
  if (e.AI_PROVIDER === "auto") return e.GEMMA_API_KEY ? "gemma" : "local";
  return e.AI_PROVIDER;
}

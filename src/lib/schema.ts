import { z } from "zod";

/** Inbound payload from the LeadPipeline island. */
export const LeadInput = z.object({
  lead: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "lead is required").max(2000, "lead too long")),
  ts_token: z.string().min(1, "Turnstile token required"),
});
export type LeadInput = z.infer<typeof LeadInput>;

/** Stage 1 — Triage: classify + extract entities + spot signals. */
export const Triage = z.object({
  classification: z.enum([
    "tire_kicker",
    "mvp_build",
    "agent_or_automation",
    "integration",
    "out_of_scope",
  ]),
  fit_score: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  entities: z.object({
    company: z.string().nullable(),
    stage: z.string().nullable(),
    team_size: z.string().nullable(),
    industry: z.string().nullable(),
    problem: z.string().min(1).max(300),
    timeline: z.string().nullable(),
    budget: z.string().nullable(),
    tech_mentioned: z.array(z.string()).max(8),
  }),
  signals: z.array(z.string()).min(1).max(6),
});
export type Triage = z.infer<typeof Triage>;

/** Stage 2 — Discovery questions to ask before scoping. */
export const Discovery = z.object({
  questions: z
    .array(
      z.object({
        topic: z.string().min(1).max(60),
        question: z.string().min(1).max(300),
      }),
    )
    .min(2)
    .max(4),
});
export type Discovery = z.infer<typeof Discovery>;

/** Stage 3 — Proposed week-by-week scope. */
export const Scope = z.object({
  weeks: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        deliverable: z.string().min(1).max(400),
      }),
    )
    .min(2)
    .max(8),
  tech_stack: z.array(z.string()).min(2).max(8),
  effort_pd: z.string().min(1).max(60),
  risks: z.array(z.string()).max(4),
});
export type Scope = z.infer<typeof Scope>;

/** Stage 4 — Personalized draft reply + concrete next step. */
export const Pitch = z.object({
  reply: z.string().min(40).max(1200),
  next_step: z.string().min(1).max(240),
});
export type Pitch = z.infer<typeof Pitch>;

/** Server → client SSE envelope. */
export type PipelineEvent =
  | { stage: 1; data: Triage }
  | { stage: 2; data: Discovery }
  | { stage: 3; data: Scope }
  | { stage: 4; data: Pitch };

/** Generic error envelope returned by the API. */
export const ApiError = z.object({
  ok: z.literal(false),
  error: z.enum([
    "invalid_input",
    "turnstile_failed",
    "rate_limited",
    "daily_cap_reached",
    "model_error",
    "internal_error",
  ]),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiError>;

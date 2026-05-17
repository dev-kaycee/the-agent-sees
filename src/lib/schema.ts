import { z } from "zod";

/** Inbound payload from the LeadQualifier island. */
export const LeadInput = z.object({
  lead: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "lead is required").max(2000, "lead too long")),
  ts_token: z.string().min(1, "Turnstile token required"),
});
export type LeadInput = z.infer<typeof LeadInput>;

/** What the agent returns once validated. The schema is also what we put in the LLM system prompt. */
export const AgentOutput = z.object({
  classification: z.enum([
    "tire_kicker",
    "mvp_build",
    "agent_or_automation",
    "integration",
    "out_of_scope",
  ]),
  priority: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  reasoning: z.string().min(1).max(200),
  suggested_action: z.string().min(1).max(200),
  draft_reply: z.string().min(1).max(500),
});
export type AgentOutput = z.infer<typeof AgentOutput>;

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

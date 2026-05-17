import { z } from "zod";

/** Inbound payload from the OpsTeam island. */
export const LeadInput = z.object({
  lead: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "input is required").max(2000, "input too long")),
  ts_token: z.string().min(1, "Turnstile token required"),
});
export type LeadInput = z.infer<typeof LeadInput>;

// Owner roles for ops tasks
const OwnerRole = z.enum([
  "founder",
  "csm",
  "engineer",
  "ops",
  "finance",
  "support",
  "marketing",
]);

// Outbound channels for the Customer Success message
const Channel = z.enum(["email", "in_app_message", "phone_call", "slack_dm"]);

/** Stage 1 — Customer Success: the customer-facing message. */
export const CustomerResponse = z.object({
  channel: Channel,
  to: z.string().min(1).max(160).nullable(),
  subject: z.string().min(1).max(200).nullable(),
  body: z.string().min(40).max(2000),
  tone_note: z.string().min(1).max(500),
});
export type CustomerResponse = z.infer<typeof CustomerResponse>;

/** Stage 2 — Operations: internal task list with owners + timing. */
export const OpsTasks = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(300),
        owner_role: OwnerRole,
        when: z.string().min(1).max(80),
        why: z.string().min(1).max(400),
      }),
    )
    .min(3)
    .max(8),
});
export type OpsTasks = z.infer<typeof OpsTasks>;

/** Stage 3 — Founder note: strategic angle + one personal action. */
export const FounderNote = z.object({
  strategic_angle: z.string().min(40).max(1500),
  one_action: z.string().min(1).max(400),
  tag: z.enum([
    "referenceable_case_study",
    "churn_risk",
    "viral_moment",
    "feedback_signal",
    "expansion_opportunity",
    "support_recovery",
    "process_gap",
    "growth_lever",
    "none",
  ]),
});
export type FounderNote = z.infer<typeof FounderNote>;

/** Stage 4 — Comms: internal Slack-style + optional external follow-up. */
export const Comms = z.object({
  slack: z.object({
    channel: z.string().min(1).max(80),
    text: z.string().min(20).max(1500),
  }),
  external_followup: z.string().min(1).max(800).nullable(),
});
export type Comms = z.infer<typeof Comms>;

/** Server → client SSE envelope. */
export type PipelineEvent =
  | { stage: 1; data: CustomerResponse }
  | { stage: 2; data: OpsTasks }
  | { stage: 3; data: FounderNote }
  | { stage: 4; data: Comms };

/** Generic error envelope. */
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

import {
  CustomerResponse,
  OpsTasks,
  FounderNote,
  Comms,
} from "./schema.js";
import type { z } from "zod";

export interface AiBinding {
  run(
    model: string,
    args: { messages: Array<{ role: string; content: string }> },
  ): Promise<{ response: string | Record<string, unknown> }>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Workers AI's response field can be a string or already-parsed object. */
export function extractJson(raw: unknown): unknown | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return null;
  const text = raw;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          start = -1;
        }
      }
    }
  }
  return null;
}

async function runStage<T>(
  ai: AiBinding,
  model: string,
  messages: ChatMessage[],
  schema: z.ZodType<T>,
  stageName: string,
): Promise<T> {
  let lastErr: unknown = null;
  let lastRaw: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { response } = await ai.run(model, { messages });
      lastRaw = response;
      const candidate = extractJson(response);
      if (candidate === null) {
        lastErr = new Error(`could not parse JSON from ${stageName} response`);
        continue;
      }
      return schema.parse(candidate);
    } catch (e) {
      lastErr = e;
    }
  }
  const rawStr =
    typeof lastRaw === "string" ? lastRaw : JSON.stringify(lastRaw);
  const detail = `stage=${stageName} | error=${lastErr instanceof Error ? lastErr.message : String(lastErr)} | preview=${JSON.stringify(rawStr?.slice(0, 300) ?? "")}`;
  console.warn("pipeline stage failed", detail);
  throw new Error(`stage_failed: ${detail}`);
}

// ============================================================================
// Shared context — the "team" framing every agent sees.
// ============================================================================

const TEAM_CONTEXT = `You are part of a 4-role virtual operations team for a business owner. The four roles work together on the same incoming event:

  Role 1 — Customer Success: writes the customer-facing message.
  Role 2 — Operations: produces the internal task list with owners + timing.
  Role 3 — Founder: provides the strategic perspective and one personal action.
  Role 4 — Comms: writes the internal team announcement.

The business is the user's business — you don't know what industry, what size, what tools. Read the event carefully and respond ONLY for your role. Sound like a real person on a real small team, not a chatbot. Refer to specifics from the event (people's names, dollar amounts, product names, dates, places). Never invent facts that weren't stated.

Your role's full instructions are in the next system message. Output ONE JSON object only — no prose, no code fences.`;

// ============================================================================
// Stage 1 — Customer Success
// ============================================================================

const CS_SYSTEM = `${TEAM_CONTEXT}

ROLE: Customer Success.

Given the event, draft the message that gets sent to the customer (or prospect, lead, reviewer, applicant — whoever the event is "about").

Return ONE JSON object:
{
  "channel": "email" | "in_app_message" | "phone_call" | "slack_dm",
  "to": string | null,              // their name if known, else null
  "subject": string | null,         // only if channel is "email"; else null
  "body": string,                   // the actual message you would send. 60-1000 chars. Personal, references specifics from the event.
  "tone_note": string               // 1 sentence: why this tone (apologetic, congratulatory, friendly, formal, etc.) given what happened
}

Rules:
- Pick the channel that fits — refund disputes go email or phone; quick wins go in-app; team conversations go slack_dm.
- "to" must be the person's name from the event when one is given. Use null only if none was mentioned.
- The body MUST reference at least one concrete detail (name, product, amount, date, place). Generic templates are forbidden.
- 2-5 sentences. Don't ramble. Sign off naturally.
- If the event is a complaint, lead with acknowledgment, not defense.
- If the event is a win (new signup, glowing review), be warm but don't be sycophantic.

Output JSON only.`;

export function buildCustomerPrompt(event: string): ChatMessage[] {
  return [
    { role: "system", content: CS_SYSTEM },
    { role: "user", content: `Event:\n${event}` },
  ];
}

export async function runCustomer(
  ai: AiBinding,
  model: string,
  event: string,
): Promise<CustomerResponse> {
  return runStage(
    ai,
    model,
    buildCustomerPrompt(event),
    CustomerResponse,
    "customer",
  );
}

// ============================================================================
// Stage 2 — Operations
// ============================================================================

const OPS_SYSTEM = `${TEAM_CONTEXT}

ROLE: Operations.

Given the event, produce the internal task list — who on the team needs to do what, and by when.

Return ONE JSON object:
{
  "tasks": [
    {
      "title": string,                                              // imperative, concrete
      "owner_role": "founder" | "csm" | "engineer" | "ops" | "finance" | "support" | "marketing",
      "when": string,                                               // "today", "this week", "by Friday", "before next call", etc.
      "why": string                                                 // 1 sentence — why this matters for THIS event
    },
    ...                                                             // 3 to 7 tasks
  ]
}

Rules:
- 3-7 tasks. Don't pad. If only 3 things matter, only list 3.
- Owner roles: pick from the enum. If a task is technical, "engineer". If it's customer-facing, "csm". Use "ops" for setup/admin work, "support" for resolving complaints, "finance" for billing/refunds, "marketing" for outreach/content, "founder" only for things that need owner attention.
- "when" is human language ("today", "this week", "by Friday"), not dates.
- Tasks must reference specifics from the event. Generic tasks like "follow up" are forbidden — say "Follow up with Sarah at Acme by Friday to confirm invoice approval workflow scope."
- Order tasks roughly by urgency (most urgent first).

Output JSON only.`;

export function buildOpsPrompt(event: string): ChatMessage[] {
  return [
    { role: "system", content: OPS_SYSTEM },
    { role: "user", content: `Event:\n${event}` },
  ];
}

export async function runOps(
  ai: AiBinding,
  model: string,
  event: string,
): Promise<OpsTasks> {
  return runStage(ai, model, buildOpsPrompt(event), OpsTasks, "ops");
}

// ============================================================================
// Stage 3 — Founder note
// ============================================================================

const FOUNDER_SYSTEM = `${TEAM_CONTEXT}

ROLE: Founder.

Given the event, write the strategic note — what does this event MEAN for the business, and what's the one thing you (the founder) should personally do about it?

Return ONE JSON object:
{
  "strategic_angle": string,        // 2-4 sentences. Founder voice — first person, plain language, honest. References specifics from the event. Surfaces the BIGGER picture (referenceable case study? early churn signal? viral moment? expansion?).
  "one_action": string,             // The single thing the founder should personally do. Concrete, e.g. "DM Sarah personally in week 2 to make sure we're solving the workflow, not just shipping software." Not generic.
  "tag": "referenceable_case_study" | "churn_risk" | "viral_moment" | "feedback_signal" | "expansion_opportunity" | "support_recovery" | "process_gap" | "growth_lever" | "none"
}

Rules:
- First person ("I", "we"). Sound like a real founder, not a strategy consultant.
- Don't restate the event — surface the angle the team might miss.
- one_action MUST be something only the founder can do (a personal touch, a strategic decision, a public statement). Not "set up a meeting" — that's ops.
- Pick the tag honestly. If nothing strategic applies, use "none".

Output JSON only.`;

export function buildFounderPrompt(event: string): ChatMessage[] {
  return [
    { role: "system", content: FOUNDER_SYSTEM },
    { role: "user", content: `Event:\n${event}` },
  ];
}

export async function runFounder(
  ai: AiBinding,
  model: string,
  event: string,
): Promise<FounderNote> {
  return runStage(
    ai,
    model,
    buildFounderPrompt(event),
    FounderNote,
    "founder",
  );
}

// ============================================================================
// Stage 4 — Comms
// ============================================================================

const COMMS_SYSTEM = `${TEAM_CONTEXT}

ROLE: Comms.

Given the event, write the internal Slack-style announcement that goes to the team, plus an optional external follow-up touch.

Return ONE JSON object:
{
  "slack": {
    "channel": string,              // e.g. "#wins", "#support", "#new-customers", "#alerts" — pick to fit the event
    "text": string                  // 2-5 sentences. Sounds like a real human posting in Slack. References specifics. Tag relevant team members by role using @csm, @founder, etc. Avoid corporate-speak.
  },
  "external_followup": string | null   // OPTIONAL external angle — case-study idea, social post draft, public response, blog snippet. Use null if there's no good external angle.
}

Rules:
- Slack channel must fit the event. Wins → #wins. Complaints → #support or #alerts. New customers → #new-customers.
- The text is Slack-natural — short paragraphs, line breaks if useful, can reference @owners.
- external_followup: if this is a positive moment worth sharing externally (win, milestone, referenceable customer), draft 1-2 sentences. If this is sensitive (complaint, refund, churn), use null.
- No emojis. We use plain text only.

Output JSON only.`;

export function buildCommsPrompt(event: string): ChatMessage[] {
  return [
    { role: "system", content: COMMS_SYSTEM },
    { role: "user", content: `Event:\n${event}` },
  ];
}

export async function runComms(
  ai: AiBinding,
  model: string,
  event: string,
): Promise<Comms> {
  return runStage(ai, model, buildCommsPrompt(event), Comms, "comms");
}

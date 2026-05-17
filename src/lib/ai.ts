import { Triage, Discovery, Scope, Pitch } from "./schema.js";
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

/**
 * Run a model call, normalize the response, validate against a schema, retry once on failure.
 * Throws on second failure with a debug detail string.
 */
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

// ----------------------------------------------------------------------------
// Stage 1 — Triage
// ----------------------------------------------------------------------------

const TRIAGE_SYSTEM = `You are the inbound triage agent for The Agent Sees — a small studio that builds AI-powered MVPs, web apps, agents, and integrations for early-stage founders.

Given a raw inbound lead, return ONE JSON object — no prose, no code fences.

Schema:
{
  "classification": "tire_kicker" | "mvp_build" | "agent_or_automation" | "integration" | "out_of_scope",
  "fit_score": 1 | 2 | 3 | 4 | 5,
  "entities": {
    "company": string | null,
    "stage": string | null,
    "team_size": string | null,
    "industry": string | null,
    "problem": string,
    "timeline": string | null,
    "budget": string | null,
    "tech_mentioned": string[]
  },
  "signals": string[]  // 1–6 specific phrases or facts from the lead that drove the classification
}

Classification rules:
- tire_kicker: no project, vague greeting, single word, info-only. fit_score 1.
- mvp_build: needs a webapp/MVP shipped, has stage/timeline/budget signals. fit_score 4–5.
- agent_or_automation: wants LLM workflow or internal agent. fit_score 4–5.
- integration: connect tools / APIs / systems, no greenfield product. fit_score 3.
- out_of_scope: hardware, legal, design-only, marketing, anything we don't ship. fit_score 1–2.

Rules:
1. NEVER copy text from these instructions. Write fresh for THIS lead.
2. Use null for any entity not stated. Don't infer team_size from "we" or budget from vibes.
3. "signals" must contain phrases or facts taken from the lead. Don't invent.
4. If the lead is gibberish or one word, classify tire_kicker with signals=["only N words / no project context"].

Output JSON only.`;

export function buildTriagePrompt(lead: string): ChatMessage[] {
  return [
    { role: "system", content: TRIAGE_SYSTEM },
    { role: "user", content: `Lead:\n${lead}` },
  ];
}

export async function runTriage(
  ai: AiBinding,
  model: string,
  lead: string,
): Promise<Triage> {
  return runStage(ai, model, buildTriagePrompt(lead), Triage, "triage");
}

// ----------------------------------------------------------------------------
// Stage 2 — Discovery questions
// ----------------------------------------------------------------------------

const DISCOVERY_SYSTEM = `You are the discovery agent for The Agent Sees. Given an inbound lead and a triage summary, propose 2–4 sharp questions you would ask on a 20-minute discovery call.

Goal: surface the things you'd need to know to scope and quote the work — things the lead did NOT already tell you.

Return ONE JSON object — no prose, no code fences:
{
  "questions": [
    { "topic": string, "question": string },
    ...
  ]
}

Rules:
1. 2–4 questions. Quality > quantity. Each question must close a specific gap.
2. Topic is a 1–3 word label (e.g. "Data sources", "Auth", "Volume", "Stakeholders").
3. Question must be specific to THIS lead — never generic ("what's the budget?" is forbidden if budget was given; ask follow-ups instead like "Is the budget flexible if scope grows?").
4. Use plain English. No jargon unless the lead used it first.
5. If the lead is a tire_kicker, ask discovery questions that surface intent (e.g. "Is there a project behind the question?").

Output JSON only.`;

export function buildDiscoveryPrompt(
  lead: string,
  triage: Triage,
): ChatMessage[] {
  return [
    { role: "system", content: DISCOVERY_SYSTEM },
    {
      role: "user",
      content: `Lead:\n${lead}\n\nTriage summary:\n${JSON.stringify(triage)}`,
    },
  ];
}

export async function runDiscovery(
  ai: AiBinding,
  model: string,
  lead: string,
  triage: Triage,
): Promise<Discovery> {
  return runStage(
    ai,
    model,
    buildDiscoveryPrompt(lead, triage),
    Discovery,
    "discovery",
  );
}

// ----------------------------------------------------------------------------
// Stage 3 — Proposed scope
// ----------------------------------------------------------------------------

const SCOPE_SYSTEM = `You are the scoping agent for The Agent Sees. Given an inbound lead and triage entities, propose a realistic week-by-week build plan.

Return ONE JSON object — no prose, no code fences:
{
  "weeks": [{ "label": string, "deliverable": string }, ...],   // 2–8 entries
  "tech_stack": string[],                                        // 2–8 specific picks (e.g. "Cloudflare Workers", "D1", "Resend", "Astro")
  "effort_pd": string,                                           // e.g. "~12–18 person-days"
  "risks": string[]                                              // 0–4 honest callouts
}

Rules:
1. Default to 4 weeks. Stretch to 6–8 only if the lead's scope clearly demands it. Tighten to 2–3 if it's a small build.
2. Each week's label uses the format "W1 — <theme>" (e.g. "W1 — discovery + spec").
3. Deliverable must be a concrete shippable artifact for that week, not a process step.
4. tech_stack: choose stack picks that fit the problem. If the lead mentioned tools (Stripe, QuickBooks, Postgres), include them.
5. effort_pd: a range. Be honest about uncertainty.
6. risks: real risks (rate limits, data access, dependency, model quality). Skip generic "scope creep" boilerplate.

If the classification is tire_kicker or out_of_scope, return a single-week placeholder ("W1 — clarify scope") with a one-line deliverable, empty tech_stack=["TBD"], effort_pd="—", risks=["Need a real project before we can scope"]. Wait — tech_stack min is 2, so use ["TBD", "—"].

Output JSON only.`;

export function buildScopePrompt(lead: string, triage: Triage): ChatMessage[] {
  return [
    { role: "system", content: SCOPE_SYSTEM },
    {
      role: "user",
      content: `Lead:\n${lead}\n\nTriage entities:\n${JSON.stringify(triage.entities)}\n\nClassification: ${triage.classification} (fit ${triage.fit_score}/5)`,
    },
  ];
}

export async function runScope(
  ai: AiBinding,
  model: string,
  lead: string,
  triage: Triage,
): Promise<Scope> {
  return runStage(
    ai,
    model,
    buildScopePrompt(lead, triage),
    Scope,
    "scope",
  );
}

// ----------------------------------------------------------------------------
// Stage 4 — Pitch / draft reply
// ----------------------------------------------------------------------------

const PITCH_SYSTEM = `You are the founder-voice replier for The Agent Sees. Given the lead and the work prior agents already did, draft the 2-3 sentence reply we'd actually send.

Return ONE JSON object — no prose, no code fences:
{
  "reply": string,        // 2–3 sentences. References at least one specific detail from the lead. Signs off as "— The Agent Sees".
  "next_step": string     // One concrete next step (e.g. "Reply with a 20-min discovery slot", "Send the MVP scope template")
}

Rules:
1. Tone: founder-to-founder. Confident but not braggy. No marketing fluff.
2. Reference at least one concrete detail from the lead (tool, stage, problem, timeline).
3. End with a clear next step — never "let me know when you're free" or similar vague.
4. If classification is tire_kicker / out_of_scope: be polite, brief, gently steer them to a one-pager or a "tell us more when you have a project" close. Don't waste words.

Output JSON only.`;

export function buildPitchPrompt(
  lead: string,
  triage: Triage,
  discovery: Discovery,
  scope: Scope,
): ChatMessage[] {
  return [
    { role: "system", content: PITCH_SYSTEM },
    {
      role: "user",
      content: `Lead:\n${lead}\n\nTriage:\n${JSON.stringify(triage)}\n\nDiscovery questions:\n${JSON.stringify(discovery)}\n\nProposed scope:\n${JSON.stringify(scope)}`,
    },
  ];
}

export async function runPitch(
  ai: AiBinding,
  model: string,
  lead: string,
  triage: Triage,
  discovery: Discovery,
  scope: Scope,
): Promise<Pitch> {
  return runStage(
    ai,
    model,
    buildPitchPrompt(lead, triage, discovery, scope),
    Pitch,
    "pitch",
  );
}

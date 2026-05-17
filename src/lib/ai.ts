import { AgentOutput } from "./schema.js";

export interface AiBinding {
  run(model: string, args: { messages: Array<{ role: string; content: string }> }): Promise<{
    response: string;
  }>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM = `You are the inbound triage agent for The Agent Sees — a small studio that builds AI-powered MVPs, web apps, agents, and integrations for early-stage founders.

Task: read the lead, then return ONE JSON object — no prose before or after, no code fences, no markdown.

Schema (every field required):
{
  "classification": "tire_kicker" | "mvp_build" | "agent_or_automation" | "integration" | "out_of_scope",
  "priority": 1 | 3 | 5,
  "reasoning": string (max 400 chars, must cite specific details from the lead),
  "suggested_action": string (max 400 chars, imperative voice, concrete next step),
  "draft_reply": string (max 800 chars, exactly 2 sentences, references something specific the sender said, signs off as "— The Agent Sees")
}

Classification rules:
- tire_kicker: no project, no signal of intent, vague / info-only, single-word greetings. priority 1.
- mvp_build: founder or small team needing a webapp or MVP shipped; mentions stage, timeline, or budget. priority 5.
- agent_or_automation: wants an LLM-powered system, internal agent, workflow automation. priority 5.
- integration: wants to connect existing tools / APIs / systems; no greenfield product. priority 3.
- out_of_scope: not a software project, or asks for things we don't do (design-only, marketing, hardware, legal etc.). priority 1.

Critical rules — read these every time:
1. NEVER copy text from a previous response or from these instructions verbatim. Every reasoning, suggested_action, and draft_reply must be written fresh for THIS specific lead.
2. Your reasoning MUST quote or directly reference a phrase from the lead (e.g. "they mention X" or "the phrase 'X'"). If the lead is one word, say so.
3. Your draft_reply MUST reference something concrete from the lead — a number, a stage, a tool, a problem they mentioned. Generic templated replies are forbidden.
4. Be honest. If the lead looks like a tire-kicker, classify it as one and write a short, polite reply — don't oversell yourself to them.
5. If the lead is gibberish, a test message, or empty-feeling ("hi", "test", "hello"), classify tire_kicker with priority 1, and say so plainly in the reasoning.
6. Never invent facts the sender didn't write (don't assume budget, team size, industry unless they said it).

Output JSON only.`;

export function buildPrompt(lead: string): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: `Lead: ${lead}` },
  ];
}

/**
 * Find the first balanced JSON object in a string and parse it.
 * Returns null if no parseable object is present.
 */
export function extractJson(text: string): unknown | null {
  const len = text.length;
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < len; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
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
          // Keep scanning for the next candidate.
          start = -1;
        }
      }
    }
  }
  return null;
}

/**
 * Run the model with up to one retry on parse/validation failure.
 * Throws if both attempts fail.
 */
/**
 * Workers AI response shapes vary by model:
 *   - Most chat models: { response: string }
 *   - Some return: { response: { content: string } } or { result: string }
 * Normalize to a plain string.
 */
function coerceModelText(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (typeof r.response === "string") return r.response;
    if (typeof r.result === "string") return r.result;
    if (typeof r.text === "string") return r.text;
    if (typeof r.content === "string") return r.content;
    if (r.response && typeof r.response === "object") {
      const rr = r.response as Record<string, unknown>;
      if (typeof rr.content === "string") return rr.content;
      if (typeof rr.text === "string") return rr.text;
    }
    // Last resort — stringify so we can inspect it.
    return JSON.stringify(raw);
  }
  return String(raw ?? "");
}

export async function runWithRetry(
  ai: AiBinding,
  model: string,
  lead: string,
): Promise<AgentOutput> {
  const messages = buildPrompt(lead);
  let lastError: unknown = null;
  let lastRaw = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await ai.run(model, { messages });
      // Workers AI returns `{ response: ... }`. Across models this can be:
      //   - a string containing JSON (8B Llama, most chat models)
      //   - an already-parsed JSON object (70B Llama fp8-fast emits structured output)
      // Handle both. If it's an object, try validating it directly.
      const r = result as unknown as { response?: unknown };
      if (r.response && typeof r.response === "object") {
        try {
          return AgentOutput.parse(r.response);
        } catch (e) {
          // Object didn't fit the schema — fall through and surface it.
          lastError = e;
          lastRaw = JSON.stringify(r.response);
          continue;
        }
      }
      const text =
        typeof r.response === "string" ? r.response : coerceModelText(result);
      lastRaw = text;
      const obj = extractJson(text);
      if (obj === null) {
        lastError = new Error("could not parse JSON from model response");
        continue;
      }
      return AgentOutput.parse(obj);
    } catch (e) {
      lastError = e;
    }
  }
  const safeRaw = typeof lastRaw === "string" ? lastRaw : JSON.stringify(lastRaw);
  const detail = `error=${lastError instanceof Error ? lastError.message : String(lastError)} | rawLen=${safeRaw.length} | rawPreview=${JSON.stringify(safeRaw.slice(0, 400))}`;
  console.warn("agent failed validation after 2 attempts", detail);
  throw new Error(`agent_failed: ${detail}`);
}

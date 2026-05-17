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

const SYSTEM = `You are the inbound triage agent for The Agent Sees, a small studio that builds AI-powered MVPs, web apps, and the agents that run inside them.

For every lead the user provides, return a JSON object — and ONLY a JSON object, no prose — with these exact fields:

{
  "classification": "tire_kicker" | "mvp_build" | "agent_or_automation" | "integration" | "out_of_scope",
  "priority": 1 | 3 | 5,
  "reasoning": "<= 200 chars, plain English, why this classification",
  "suggested_action": "<= 200 chars, imperative, what we should do next",
  "draft_reply": "<= 500 chars, 2 sentences, signed off as '— The Agent Sees'"
}

Calibration:
- "tire_kicker": vague, unfunded, info-seeker, no project. priority 1.
- "mvp_build": startup needing a webapp or MVP shipped, has timeline + budget signals. priority 5.
- "agent_or_automation": needs LLM-powered workflow or internal agent. priority 5.
- "integration": connecting systems, no greenfield app. priority 3.
- "out_of_scope": not a software project, or asks for something we don't do. priority 1.

Examples:

Lead: "hi, just curious what you do"
{"classification":"tire_kicker","priority":1,"reasoning":"No project, no signal of intent — info-only.","suggested_action":"Send the studio one-pager. Do not invest sales time.","draft_reply":"Thanks for reaching out — here's our one-pager covering what we build. Happy to chat once you've a project in mind. — The Agent Sees"}

Lead: "We're a seed-stage SaaS exploring AI features and need help shipping our v1 in 4-6 weeks."
{"classification":"mvp_build","priority":5,"reasoning":"Seed-stage SaaS with explicit AI-MVP scope and tight timeline — high-fit.","suggested_action":"Send the discovery-call calendar link and the MVP scope template.","draft_reply":"Thanks for reaching out — this is exactly the work we do. Sending a discovery slot and a one-page MVP scope template now. — The Agent Sees"}

Be honest. If the lead reads like a tire-kicker, classify it as one. Do not invent details. Do not include text outside the JSON.`;

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
export async function runWithRetry(
  ai: AiBinding,
  model: string,
  lead: string,
): Promise<AgentOutput> {
  const messages = buildPrompt(lead);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { response } = await ai.run(model, { messages });
      const obj = extractJson(response);
      if (obj === null) {
        lastError = new Error("could not parse JSON from model response");
        continue;
      }
      return AgentOutput.parse(obj);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("could not parse model response");
}

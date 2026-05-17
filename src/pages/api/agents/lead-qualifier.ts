import type { APIRoute } from "astro";
import { LeadInput } from "../../../lib/schema.js";
import { verifyTurnstile } from "../../../lib/turnstile.js";
import { checkLimit, ipKey, dailyCapKey } from "../../../lib/rate-limit.js";
import { runWithRetry, type AiBinding } from "../../../lib/ai.js";
import type { Limiter } from "../../../lib/rate-limit.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const PER_IP_LIMIT = 5;          // requests
const PER_IP_WINDOW_S = 60;      // per minute
const DAILY_CAP = 1000;          // total per UTC day
const DAILY_WINDOW_S = 86_400;

interface Env {
  TURNSTILE_SECRET_KEY: string;
  AI: AiBinding;
  RATE_LIMIT: Limiter;
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify({ ok: true, ...(payload as object) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  // 1. Validate input
  let parsed;
  try {
    const body = await request.json();
    parsed = LeadInput.parse(body);
  } catch (e) {
    return jsonError(400, "invalid_input", e instanceof Error ? e.message : "Invalid input");
  }

  // 2. Verify Turnstile
  const turnstileOk = await verifyTurnstile(
    parsed.ts_token,
    env.TURNSTILE_SECRET_KEY,
    clientAddress,
  );
  if (!turnstileOk) {
    return jsonError(403, "turnstile_failed", "Turnstile check failed. Refresh and try again.");
  }

  // 3. Rate limit (per IP)
  const ipCheck = await checkLimit(
    env.RATE_LIMIT,
    ipKey(clientAddress ?? "unknown"),
    PER_IP_LIMIT,
    PER_IP_WINDOW_S,
  );
  if (!ipCheck.allowed) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "rate_limited",
        message: `Too many requests. Try again in ${ipCheck.retryAfterSeconds}s.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(ipCheck.retryAfterSeconds),
        },
      },
    );
  }

  // 4. Daily cap (global)
  const dailyCheck = await checkLimit(
    env.RATE_LIMIT,
    dailyCapKey(),
    DAILY_CAP,
    DAILY_WINDOW_S,
  );
  if (!dailyCheck.allowed) {
    return jsonError(
      429,
      "daily_cap_reached",
      "The demo is at today's free-tier limit. Try again tomorrow, or book a call.",
    );
  }

  // 5. Run model
  try {
    const result = await runWithRetry(env.AI, MODEL, parsed.lead);
    return jsonOk(result);
  } catch {
    return jsonError(
      502,
      "model_error",
      "The model couldn't return a valid response. Please try a different phrasing.",
    );
  }
};

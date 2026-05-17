import type { APIRoute } from "astro";
import { LeadInput } from "../../../lib/schema.js";
import { verifyTurnstile } from "../../../lib/turnstile.js";
import { checkLimit, ipKey, dailyCapKey } from "../../../lib/rate-limit.js";
import {
  runCustomer,
  runOps,
  runFounder,
  runComms,
  type AiBinding,
} from "../../../lib/ai.js";
import type { Limiter } from "../../../lib/rate-limit.js";

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const PER_IP_LIMIT = 5;
const PER_IP_WINDOW_S = 60;
const DAILY_CAP = 1000;
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

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  const env = (locals as { runtime: { env: Env } }).runtime.env;

  let parsed;
  try {
    const body = await request.json();
    parsed = LeadInput.parse(body);
  } catch (e) {
    return jsonError(400, "invalid_input", e instanceof Error ? e.message : "Invalid input");
  }

  const turnstile = await verifyTurnstile(
    parsed.ts_token,
    env.TURNSTILE_SECRET_KEY,
    clientAddress,
  );
  if (!turnstile.success) {
    console.warn("turnstile rejected", { codes: turnstile.errorCodes });
    return jsonError(
      403,
      "turnstile_failed",
      "Security check failed. Refresh and try again.",
    );
  }

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
      "The demo is at today's free-tier limit. Try again tomorrow.",
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("open", { ok: true });

      try {
        const customer = await runCustomer(env.AI, MODEL, parsed.lead);
        send("stage", { stage: 1, data: customer });

        const ops = await runOps(env.AI, MODEL, parsed.lead);
        send("stage", { stage: 2, data: ops });

        const founder = await runFounder(env.AI, MODEL, parsed.lead);
        send("stage", { stage: 3, data: founder });

        const comms = await runComms(env.AI, MODEL, parsed.lead);
        send("stage", { stage: 4, data: comms });

        send("done", { ok: true });
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.warn("pipeline error", detail);
        send("error", {
          ok: false,
          message:
            "One of the agents stumbled — try a slightly different phrasing. Single-word inputs sometimes break it.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers: SSE_HEADERS });
};

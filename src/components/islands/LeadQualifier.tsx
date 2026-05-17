import { useEffect, useRef, useState } from "preact/hooks";

interface Result {
  classification: string;
  priority: 1 | 3 | 5;
  reasoning: string;
  suggested_action: string;
  draft_reply: string;
}

type Status =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "done"; result: Result }
  | { state: "error"; message: string };

interface Props {
  turnstileSiteKey: string;
}

declare global {
  interface Window {
    turnstile?: {
      render(
        container: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          appearance?: "always" | "execute" | "interaction-only";
          execution?: "render" | "execute";
          theme?: "light" | "dark" | "auto";
        },
      ): string;
      execute(widgetId: string): void;
      reset(widgetId: string): void;
      getResponse(widgetId: string): string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

const EXAMPLE_LEAD =
  "Hey — we're a seed-stage SaaS (10 ppl) and want to ship an AI feature for our v1 in the next 6 weeks. Realistic?";

export default function LeadQualifier({ turnstileSiteKey }: Props) {
  const [lead, setLead] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [tsReady, setTsReady] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>("");

  // Load Turnstile, render widget on mount, auto-execute, cache token.
  useEffect(() => {
    const renderWidget = () => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        appearance: "interaction-only",
        execution: "render", // auto-execute on render — token cached and ready by the time user clicks
        theme: "light",
        callback: (token) => {
          tokenRef.current = token;
          setTsReady(true);
        },
        "error-callback": () => {
          tokenRef.current = "";
          setTsReady(false);
        },
        "expired-callback": () => {
          tokenRef.current = "";
          setTsReady(false);
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
      return;
    }

    if (document.querySelector("script[data-turnstile]")) {
      // Script tag exists but hasn't fired yet — poll briefly.
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    window.onTurnstileLoad = renderWidget;
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    document.head.appendChild(script);
  }, [turnstileSiteKey]);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmed = lead.trim();
    if (!trimmed) return;

    // Re-read the current token (Turnstile may have refreshed it).
    let token = tokenRef.current;
    if (!token && widgetIdRef.current && window.turnstile) {
      token = window.turnstile.getResponse(widgetIdRef.current) ?? "";
    }

    if (!token) {
      setStatus({
        state: "error",
        message:
          "Security check isn't ready yet — wait a second and try again. If it keeps failing, refresh the page.",
      });
      return;
    }

    setStatus({ state: "submitting" });

    try {
      const res = await fetch("/api/agents/lead-qualifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: trimmed, ts_token: token }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            classification: string;
            priority: 1 | 3 | 5;
            reasoning: string;
            suggested_action: string;
            draft_reply: string;
          }
        | { ok: false; error: string; message: string };

      if (!json.ok) {
        setStatus({ state: "error", message: json.message });
      } else {
        setStatus({
          state: "done",
          result: {
            classification: json.classification,
            priority: json.priority,
            reasoning: json.reasoning,
            suggested_action: json.suggested_action,
            draft_reply: json.draft_reply,
          },
        });
      }
    } catch {
      setStatus({
        state: "error",
        message: "Network error — refresh and try again, or email hello@theagentsees.com directly.",
      });
    }

    // Reset Turnstile for the next submission (token is single-use server-side).
    tokenRef.current = "";
    setTsReady(false);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  };

  const reset = () => {
    setLead("");
    setStatus({ state: "idle" });
  };

  const submitDisabled =
    status.state === "submitting" || !lead.trim() || !tsReady;

  return (
    <div class="lq">
      <form onSubmit={onSubmit} class="lq__form">
        <label class="lq__label" htmlFor="lq-input">
          Paste a hypothetical inbound lead
        </label>
        <textarea
          id="lq-input"
          class="lq__textarea"
          value={lead}
          maxLength={2000}
          rows={4}
          placeholder={EXAMPLE_LEAD}
          disabled={status.state === "submitting"}
          onInput={(e) => setLead((e.target as HTMLTextAreaElement).value)}
        />
        <div class="lq__row">
          <span class="lq__count">{lead.length} / 2000</span>
          <div class="lq__actions">
            {status.state === "done" && (
              <button type="button" class="lq__btn lq__btn--ghost" onClick={reset}>
                Try another
              </button>
            )}
            <button type="submit" class="lq__btn" disabled={submitDisabled}>
              {status.state === "submitting"
                ? "Thinking…"
                : !tsReady
                ? "Preparing…"
                : "Run the agent"}
            </button>
          </div>
        </div>
        <div ref={widgetRef} class="lq__turnstile" />
      </form>

      <div class="lq__output" aria-live="polite">
        {status.state === "idle" && (
          <p class="lq__hint">
            Output will appear here. The agent runs on a free-tier model — expect a couple of seconds.
          </p>
        )}
        {status.state === "submitting" && <p class="lq__hint">Running the model…</p>}
        {status.state === "error" && <p class="lq__error">{status.message}</p>}
        {status.state === "done" && (
          <dl class="lq__fields">
            <div class="lq__field">
              <dt>classification</dt>
              <dd>{status.result.classification}</dd>
            </div>
            <div class="lq__field">
              <dt>priority</dt>
              <dd>{status.result.priority} / 5</dd>
            </div>
            <div class="lq__field">
              <dt>reasoning</dt>
              <dd>{status.result.reasoning}</dd>
            </div>
            <div class="lq__field">
              <dt>suggested action</dt>
              <dd>{status.result.suggested_action}</dd>
            </div>
            <div class="lq__field">
              <dt>draft reply</dt>
              <dd>{status.result.draft_reply}</dd>
            </div>
          </dl>
        )}
      </div>

      <p class="lq__disclaimer">
        This demo runs on a free, on-device-grade model (Llama 3.1 8B via Cloudflare Workers AI). Real engagements use models and tooling fitted to your data.
      </p>
    </div>
  );
}

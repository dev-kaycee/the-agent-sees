import { useEffect, useRef, useState } from "preact/hooks";

// ---------- types (mirror src/lib/schema.ts shapes) ----------

interface Triage {
  classification: string;
  fit_score: 1 | 2 | 3 | 4 | 5;
  entities: {
    company: string | null;
    stage: string | null;
    team_size: string | null;
    industry: string | null;
    problem: string;
    timeline: string | null;
    budget: string | null;
    tech_mentioned: string[];
  };
  signals: string[];
}

interface Discovery {
  questions: Array<{ topic: string; question: string }>;
}

interface Scope {
  weeks: Array<{ label: string; deliverable: string }>;
  tech_stack: string[];
  effort_pd: string;
  risks: string[];
}

interface Pitch {
  reply: string;
  next_step: string;
}

interface Pipeline {
  triage?: Triage;
  discovery?: Discovery;
  scope?: Scope;
  pitch?: Pitch;
}

type Status =
  | { state: "idle" }
  | { state: "running"; current: 1 | 2 | 3 | 4 }
  | { state: "done" }
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
      reset(widgetId: string): void;
      getResponse(widgetId: string): string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

const EXAMPLE =
  "We're a 12-person fintech. Need a Stripe → QuickBooks nightly reconciliation agent that flags any mismatches in a Slack channel. Budget ~$15k, want it live in 5 weeks.";

const STAGE_LABELS = [
  "Triage",
  "Discovery questions",
  "Proposed scope",
  "Draft reply",
] as const;

// ---------- component ----------

export default function LeadPipeline({ turnstileSiteKey }: Props) {
  const [lead, setLead] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [pipeline, setPipeline] = useState<Pipeline>({});
  const [tsReady, setTsReady] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // Inject Turnstile + render invisible widget once.
  useEffect(() => {
    const renderWidget = () => {
      if (!window.turnstile || !widgetRef.current || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(widgetRef.current, {
        sitekey: turnstileSiteKey,
        appearance: "interaction-only",
        execution: "render",
        theme: "light",
        callback: (t) => {
          tokenRef.current = t;
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
      const id = setInterval(() => {
        if (window.turnstile) {
          clearInterval(id);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(id);
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

  // Cleanup any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const text = lead.trim();
    if (!text) return;

    let token = tokenRef.current;
    if (!token && widgetIdRef.current && window.turnstile) {
      token = window.turnstile.getResponse(widgetIdRef.current) ?? "";
    }
    if (!token) {
      setStatus({
        state: "error",
        message: "Security check isn't ready yet — wait a second and try again.",
      });
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPipeline({});
    setStatus({ state: "running", current: 1 });

    try {
      const res = await fetch("/api/agents/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: text, ts_token: token }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setStatus({
          state: "error",
          message: body.message ?? "Something went wrong.",
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events as they arrive. Each event ends with \n\n.
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          handleEvent(block);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setStatus({
        state: "error",
        message: "Network error — refresh and try again.",
      });
    } finally {
      tokenRef.current = "";
      setTsReady(false);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  };

  function handleEvent(block: string) {
    const lines = block.split("\n");
    let eventName = "message";
    let dataStr = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) eventName = line.slice(7).trim();
      else if (line.startsWith("data: ")) dataStr += line.slice(6);
    }
    if (!dataStr) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(dataStr);
    } catch {
      return;
    }
    if (eventName === "stage") {
      const ev = parsed as { stage: 1 | 2 | 3 | 4; data: unknown };
      setPipeline((p) => {
        const next = { ...p };
        if (ev.stage === 1) next.triage = ev.data as Triage;
        else if (ev.stage === 2) next.discovery = ev.data as Discovery;
        else if (ev.stage === 3) next.scope = ev.data as Scope;
        else if (ev.stage === 4) next.pitch = ev.data as Pitch;
        return next;
      });
      // Move "running" pointer to the next stage if there is one.
      setStatus((s) => {
        if (s.state !== "running") return s;
        const next = (ev.stage + 1) as 1 | 2 | 3 | 4 | 5;
        if (next > 4) return { state: "done" };
        return { state: "running", current: next as 1 | 2 | 3 | 4 };
      });
    } else if (eventName === "done") {
      setStatus({ state: "done" });
    } else if (eventName === "error") {
      const ev = parsed as { message: string };
      setStatus({ state: "error", message: ev.message });
    }
  }

  const reset = () => {
    setLead("");
    setPipeline({});
    setStatus({ state: "idle" });
  };

  const useExample = () => setLead(EXAMPLE);

  const submitDisabled =
    status.state === "running" || !lead.trim() || !tsReady;

  return (
    <div class="pl">
      <form onSubmit={onSubmit} class="pl__form">
        <div class="pl__label-row">
          <label class="pl__label" htmlFor="pl-input">
            Paste a hypothetical inbound lead
          </label>
          <button
            type="button"
            class="pl__example-btn"
            onClick={useExample}
            disabled={status.state === "running"}
          >
            Try an example →
          </button>
        </div>
        <textarea
          id="pl-input"
          class="pl__textarea"
          value={lead}
          maxLength={2000}
          rows={4}
          placeholder={EXAMPLE}
          disabled={status.state === "running"}
          onInput={(e) => setLead((e.target as HTMLTextAreaElement).value)}
        />
        <div class="pl__row">
          <span class="pl__count">{lead.length} / 2000</span>
          <div class="pl__actions">
            {status.state === "done" && (
              <button type="button" class="pl__btn pl__btn--ghost" onClick={reset}>
                Try another
              </button>
            )}
            <button type="submit" class="pl__btn" disabled={submitDisabled}>
              {status.state === "running"
                ? "Running pipeline…"
                : !tsReady
                ? "Preparing…"
                : "Run the pipeline"}
            </button>
          </div>
        </div>
        <div ref={widgetRef} class="pl__turnstile" />
      </form>

      {status.state === "error" && (
        <p class="pl__error" role="alert">
          {status.message}
        </p>
      )}

      {(status.state === "running" ||
        status.state === "done" ||
        status.state === "error") && (
        <ol class="pl__steps" aria-live="polite">
          {STAGE_LABELS.map((label, i) => {
            const stageNum = (i + 1) as 1 | 2 | 3 | 4;
            const data = [
              pipeline.triage,
              pipeline.discovery,
              pipeline.scope,
              pipeline.pitch,
            ][i];
            const isDone = !!data;
            const isActive =
              status.state === "running" && status.current === stageNum;
            return (
              <li
                class={`pl-step ${isDone ? "pl-step--done" : ""} ${isActive ? "pl-step--active" : ""}`}
              >
                <div class="pl-step__head">
                  <span class="pl-step__num">
                    {String(stageNum).padStart(2, "0")}
                  </span>
                  <span class="pl-step__title">{label}</span>
                  <span class="pl-step__status">
                    {isDone ? (
                      <Tick />
                    ) : isActive ? (
                      <Spinner />
                    ) : (
                      <span class="pl-step__pending">pending</span>
                    )}
                  </span>
                </div>
                {isDone && (
                  <div class="pl-step__body">
                    {stageNum === 1 && pipeline.triage && (
                      <TriageCard t={pipeline.triage} />
                    )}
                    {stageNum === 2 && pipeline.discovery && (
                      <DiscoveryCard d={pipeline.discovery} />
                    )}
                    {stageNum === 3 && pipeline.scope && (
                      <ScopeCard s={pipeline.scope} />
                    )}
                    {stageNum === 4 && pipeline.pitch && (
                      <PitchCard p={pipeline.pitch} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p class="pl__disclaimer">
        Four agents run end-to-end on a free model (Llama 3.3 70B fp8-fast via
        Cloudflare Workers AI). Real engagements use models, tools, and data
        fitted to your problem.
      </p>
    </div>
  );
}

// ---------- per-stage cards ----------

function Pill({ children }: { children: preact.ComponentChildren }) {
  return <span class="pl-pill">{children}</span>;
}

function TriageCard({ t }: { t: Triage }) {
  const e = t.entities;
  return (
    <div class="pl-stage">
      <div class="pl-stage__row">
        <span class="pl-stage__k">classification</span>
        <span class="pl-stage__v pl-stage__v--mono">{t.classification}</span>
      </div>
      <div class="pl-stage__row">
        <span class="pl-stage__k">fit score</span>
        <span class="pl-stage__v">
          <FitBar score={t.fit_score} />
          <span class="pl-fit__val">{t.fit_score} / 5</span>
        </span>
      </div>
      <div class="pl-stage__row pl-stage__row--col">
        <span class="pl-stage__k">extracted</span>
        <div class="pl-pills">
          {e.company && <Pill>company · {e.company}</Pill>}
          {e.stage && <Pill>stage · {e.stage}</Pill>}
          {e.team_size && <Pill>team · {e.team_size}</Pill>}
          {e.industry && <Pill>industry · {e.industry}</Pill>}
          {e.timeline && <Pill>timeline · {e.timeline}</Pill>}
          {e.budget && <Pill>budget · {e.budget}</Pill>}
          {e.tech_mentioned.map((tech) => (
            <Pill>tech · {tech}</Pill>
          ))}
        </div>
      </div>
      <div class="pl-stage__row pl-stage__row--col">
        <span class="pl-stage__k">problem</span>
        <span class="pl-stage__v">{e.problem}</span>
      </div>
      <div class="pl-stage__row pl-stage__row--col">
        <span class="pl-stage__k">signals</span>
        <ul class="pl-bullets">
          {t.signals.map((s) => (
            <li>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DiscoveryCard({ d }: { d: Discovery }) {
  return (
    <ol class="pl-questions">
      {d.questions.map((q, i) => (
        <li>
          <span class="pl-questions__num">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div class="pl-questions__body">
            <span class="pl-questions__topic">{q.topic}</span>
            <span class="pl-questions__q">{q.question}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ScopeCard({ s }: { s: Scope }) {
  return (
    <div class="pl-stage">
      <ol class="pl-weeks">
        {s.weeks.map((w) => (
          <li>
            <span class="pl-weeks__label">{w.label}</span>
            <span class="pl-weeks__deliv">{w.deliverable}</span>
          </li>
        ))}
      </ol>
      <div class="pl-stage__row pl-stage__row--col">
        <span class="pl-stage__k">tech stack</span>
        <div class="pl-pills">
          {s.tech_stack.map((t) => (
            <Pill>{t}</Pill>
          ))}
        </div>
      </div>
      <div class="pl-stage__row">
        <span class="pl-stage__k">effort</span>
        <span class="pl-stage__v pl-stage__v--mono">{s.effort_pd}</span>
      </div>
      {s.risks.length > 0 && (
        <div class="pl-stage__row pl-stage__row--col">
          <span class="pl-stage__k">risks</span>
          <ul class="pl-bullets">
            {s.risks.map((r) => (
              <li>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PitchCard({ p }: { p: Pitch }) {
  return (
    <div class="pl-stage">
      <blockquote class="pl-reply">{p.reply}</blockquote>
      <div class="pl-stage__row">
        <span class="pl-stage__k">next step</span>
        <span class="pl-stage__v">{p.next_step}</span>
      </div>
    </div>
  );
}

function FitBar({ score }: { score: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span class="pl-fit" aria-label={`fit ${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span class={`pl-fit__seg ${i <= score ? "pl-fit__seg--on" : ""}`} />
      ))}
    </span>
  );
}

function Tick() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      class="pl-spinner"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" opacity="0.2" />
      <path d="M14 8a6 6 0 0 0-6-6" />
    </svg>
  );
}

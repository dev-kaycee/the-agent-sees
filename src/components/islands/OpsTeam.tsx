import { useEffect, useRef, useState } from "preact/hooks";

// ---------- types (mirror src/lib/schema.ts) ----------

interface CustomerResponse {
  channel: "email" | "in_app_message" | "phone_call" | "slack_dm";
  to: string | null;
  subject: string | null;
  body: string;
  tone_note: string;
}

interface OpsTasks {
  tasks: Array<{
    title: string;
    owner_role:
      | "founder"
      | "csm"
      | "engineer"
      | "ops"
      | "finance"
      | "support"
      | "marketing";
    when: string;
    why: string;
  }>;
}

interface FounderNote {
  strategic_angle: string;
  one_action: string;
  tag: string;
}

interface Comms {
  slack: { channel: string; text: string };
  external_followup: string | null;
}

interface Pipeline {
  customer?: CustomerResponse;
  ops?: OpsTasks;
  founder?: FounderNote;
  comms?: Comms;
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

// ---------- examples by sector ----------

interface Example {
  label: string;
  prompt: string;
}

const SECTORS: Array<{ key: string; name: string; examples: Example[] }> = [
  {
    key: "saas",
    name: "SaaS",
    examples: [
      {
        label: "New Pro signup",
        prompt:
          "Sarah Chen (CTO at Acme Corp, 50-person B2B SaaS) just signed up for our Pro plan ($299/mo). She mentioned wanting to automate their invoice approval workflow as the first use case.",
      },
      {
        label: "Trial about to expire",
        prompt:
          "Trial for Northwind Systems ends in 48 hours. They created 1 dashboard, invited 0 teammates, haven't opened the app in 6 days. Primary contact is Jamie Patel, head of analytics, 200-person team.",
      },
      {
        label: "Long-time customer churned",
        prompt:
          "Tidepool just downgraded from Enterprise back to Starter after 3 years. Exit survey said: 'too expensive for what we use'. They had 18 seats. ARR drops from \$24k to \$1.2k.",
      },
      {
        label: "Feature request × 3",
        prompt:
          "Third customer this month asked for a 'Notion-style block editor' inside our docs feature. First two were both seed-stage YC companies. Third is a mid-market design agency.",
      },
    ],
  },
  {
    key: "ecommerce",
    name: "E-commerce",
    examples: [
      {
        label: "Angry refund request",
        prompt:
          "Customer Marcus J left a 1-star review and demanded a full refund — his hoodie (Order #44219, \$89) arrived 10 days late and the size was wrong. He's a repeat customer who's bought 4 times in the past year.",
      },
      {
        label: "Influencer partnership inquiry",
        prompt:
          "@laurenbrews (87k followers, lifestyle/coffee niche) DM'd asking about a partnership. Wants 3 free items plus 20% affiliate cut. We've never done influencer deals before.",
      },
      {
        label: "Lost package",
        prompt:
          "Customer Priya M says her package (Order #51008, two ceramic mugs, \$64) was marked delivered 4 days ago but never arrived. Courier confirms photo of front door, but Priya says it's not her front door.",
      },
      {
        label: "Glowing 5-star review",
        prompt:
          "Customer Rachel posted a 5-star review on Trustpilot with two photos of our linen tote in use at a farmers' market. 230 words, mentions our packaging by name, tags us on Instagram (@rachel.kw, 4.5k followers).",
      },
    ],
  },
  {
    key: "agency",
    name: "Agency / Studio",
    examples: [
      {
        label: "New $20k retainer signed",
        prompt:
          "Counterpoint Brewing just signed our 6-month brand retainer (\$20k/mo). Their CMO, Daniela Reyes, was referred by a previous client (Orbital Cafe). Kickoff is in 2 weeks.",
      },
      {
        label: "Scope creep, unpaid",
        prompt:
          "Client Northern Cycle (logo + identity, \$8k fixed-price) keeps asking for 'small additions' — packaging, business cards, an email signature kit. None of it was in the original scope. They're 3 weeks into the engagement and haven't paid the 50% deposit yet.",
      },
      {
        label: "Project running late",
        prompt:
          "The Halo Foods website rebuild is 2 weeks behind. We promised launch by month-end (in 9 days). Two of three pages are ready. The CMS migration is the blocker — their content team hasn't delivered final copy.",
      },
      {
        label: "Referral lead",
        prompt:
          "James Okoye (former client, ran Bright Path Education) just emailed: he's joining a fintech startup as marketing lead and wants us to do the launch identity. \$15k-ish budget. Timeline: 4 weeks.",
      },
    ],
  },
  {
    key: "local",
    name: "Local / Restaurant",
    examples: [
      {
        label: "1-star Google review",
        prompt:
          "New 1-star Google review for our cafe: 'Waited 25 minutes for a flat white. Watched two other tables get served before us. Manager seemed busy on the phone. Won't be back.' Reviewer is a regular — has been here 3 times before per loyalty app.",
      },
      {
        label: "Catering inquiry, large",
        prompt:
          "Inquiry just came in via the website: 200-person corporate lunch for an offsite, 3 weeks out, at a venue in the city. They want our full menu rotated through stations. Budget hinted at \$30-40 per head.",
      },
      {
        label: "Glowing review + photo",
        prompt:
          "Couple just left a beaming 5-star review on Google with a photo of our weekend pasta special, calling it 'the best meal we've had in the city all year'. Reviewer's profile shows they review a lot of high-end restaurants in the area.",
      },
      {
        label: "Regular complains in person",
        prompt:
          "Mr. Andersen (weekly regular for 4+ years, always orders the same thing) came in and quietly told the manager that the espresso has 'tasted off for two weeks running'. He's the third regular to mention it this week.",
      },
    ],
  },
  {
    key: "coach",
    name: "Coach / Consultant",
    examples: [
      {
        label: "Discovery call booked",
        prompt:
          "Discovery call booked for Thursday: Aiden Walsh, founder of a 6-person bootstrapped agency in Austin doing \$60k MRR. He found us through a podcast interview and wants help moving from agency to productized service.",
      },
      {
        label: "Refund request mid-program",
        prompt:
          "Maria (joined our 12-week leadership program 3 weeks ago, paid \$4,800 upfront) just emailed asking for a partial refund. Said she's 'not getting what she expected' and the cohort calls feel 'too generic'. Strong testimonials from previous cohorts.",
      },
      {
        label: "Client referred 3 friends",
        prompt:
          "Theo finished our program 6 months ago and just emailed introducing three friends who all want to enroll — two are CTOs at growing startups, one is a department head at a hospital. All three asked Theo if they should book a call with us this week.",
      },
      {
        label: "Pricing question",
        prompt:
          "Cold inquiry via the contact form: 'How much is your 1:1 program? Just a quick number — don't need the discovery call yet.' From: M. Lee at a tech company we don't recognize. Single line, no other context.",
      },
    ],
  },
  {
    key: "clinic",
    name: "Healthcare / Clinic",
    examples: [
      {
        label: "New patient intake",
        prompt:
          "New patient form submitted for next Tuesday: David Ng, 38, new to the city, looking for an annual physical and to establish care. Listed family history of cardiovascular disease and is currently on no medications. Has Aetna insurance.",
      },
      {
        label: "Missed appointment, no response",
        prompt:
          "Patient Elena F missed her follow-up appointment today (post-surgery 2-week check). Front desk has tried calling twice, sent an SMS, no response. Surgery was 12 days ago — minor outpatient, low risk but follow-up matters.",
      },
      {
        label: "Negative Healthgrades review",
        prompt:
          "New 2-star Healthgrades review: 'Dr. Kim was rushed, didn't make eye contact, prescribed something without explaining why. Front desk staff was friendly though.' Reviewer is anonymous; we don't know who they are.",
      },
      {
        label: "Insurance question, new patient",
        prompt:
          "Inquiry through the website: 'Do you take Cigna PPO? Trying to decide if I should switch from my current provider. Also, do you offer same-day appointments?' From a name we don't have on file.",
      },
    ],
  },
];

const OWNER_LABEL: Record<string, string> = {
  founder: "Founder",
  csm: "Customer Success",
  engineer: "Engineering",
  ops: "Operations",
  finance: "Finance",
  support: "Support",
  marketing: "Marketing",
};

const TAG_LABEL: Record<string, string> = {
  referenceable_case_study: "Referenceable case study",
  churn_risk: "Churn risk",
  viral_moment: "Viral moment",
  feedback_signal: "Feedback signal",
  expansion_opportunity: "Expansion opportunity",
  support_recovery: "Support recovery",
  process_gap: "Process gap",
  growth_lever: "Growth lever",
  none: "—",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  in_app_message: "In-app",
  phone_call: "Phone call",
  slack_dm: "Slack DM",
};

const ROLE_LABELS = [
  "Customer Success",
  "Operations",
  "Founder",
  "Comms",
] as const;

// ---------- component ----------

export default function OpsTeam({ turnstileSiteKey }: Props) {
  const [sectorKey, setSectorKey] = useState(SECTORS[0].key);
  const [event, setEvent] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [pipeline, setPipeline] = useState<Pipeline>({});
  const [tsReady, setTsReady] = useState(false);

  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const sector = SECTORS.find((s) => s.key === sectorKey) ?? SECTORS[0];

  // Inject Turnstile + render once.
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
    const s = document.createElement("script");
    s.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
    s.async = true;
    s.defer = true;
    s.dataset.turnstile = "true";
    document.head.appendChild(s);
  }, [turnstileSiteKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const onSubmit = async (e: Event) => {
    e.preventDefault();
    const text = event.trim();
    if (!text) return;

    let token = tokenRef.current;
    if (!token && widgetIdRef.current && window.turnstile) {
      token = window.turnstile.getResponse(widgetIdRef.current) ?? "";
    }
    if (!token) {
      setStatus({
        state: "error",
        message:
          "Security check isn't ready yet — wait a second and try again.",
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
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
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
        if (ev.stage === 1) next.customer = ev.data as CustomerResponse;
        else if (ev.stage === 2) next.ops = ev.data as OpsTasks;
        else if (ev.stage === 3) next.founder = ev.data as FounderNote;
        else if (ev.stage === 4) next.comms = ev.data as Comms;
        return next;
      });
      setStatus((s) => {
        if (s.state !== "running") return s;
        const n = (ev.stage + 1) as 1 | 2 | 3 | 4 | 5;
        if (n > 4) return { state: "done" };
        return { state: "running", current: n as 1 | 2 | 3 | 4 };
      });
    } else if (eventName === "done") {
      setStatus({ state: "done" });
    } else if (eventName === "error") {
      const ev = parsed as { message: string };
      setStatus({ state: "error", message: ev.message });
    }
  }

  const useExample = (ex: Example) => setEvent(ex.prompt);
  const reset = () => {
    setEvent("");
    setPipeline({});
    setStatus({ state: "idle" });
  };

  const submitDisabled =
    status.state === "running" || !event.trim() || !tsReady;

  return (
    <div class="ot">
      <form onSubmit={onSubmit} class="ot__form">
        <div>
          <p class="ot__label">Pick a sector</p>
          <div class="ot__sectors">
            {SECTORS.map((s) => (
              <button
                type="button"
                class={`ot__sector ${s.key === sectorKey ? "ot__sector--active" : ""}`}
                onClick={() => setSectorKey(s.key)}
                disabled={status.state === "running"}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p class="ot__label">Try an example</p>
          <div class="ot__examples">
            {sector.examples.map((ex) => (
              <button
                type="button"
                class="ot__example"
                onClick={() => useExample(ex)}
                disabled={status.state === "running"}
              >
                {ex.label} →
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="ot__label" htmlFor="ot-input">
            Or describe the event yourself
          </label>
          <textarea
            id="ot-input"
            class="ot__textarea"
            value={event}
            maxLength={2000}
            rows={5}
            placeholder={sector.examples[0]?.prompt ?? ""}
            disabled={status.state === "running"}
            onInput={(e) =>
              setEvent((e.target as HTMLTextAreaElement).value)
            }
          />
          <div class="ot__row">
            <span class="ot__count">{event.length} / 2000</span>
            <div class="ot__actions">
              {status.state === "done" && (
                <button
                  type="button"
                  class="ot__btn ot__btn--ghost"
                  onClick={reset}
                >
                  Try another
                </button>
              )}
              <button type="submit" class="ot__btn" disabled={submitDisabled}>
                {status.state === "running"
                  ? "Your team is on it…"
                  : !tsReady
                  ? "Preparing…"
                  : "Run your ops team"}
              </button>
            </div>
          </div>
          <div ref={widgetRef} class="ot__turnstile" />
        </div>
      </form>

      {status.state === "error" && (
        <p class="ot__error" role="alert">
          {status.message}
        </p>
      )}

      {(status.state === "running" ||
        status.state === "done" ||
        status.state === "error") && (
        <ol class="ot__roles" aria-live="polite">
          {ROLE_LABELS.map((label, i) => {
            const stageNum = (i + 1) as 1 | 2 | 3 | 4;
            const data = [
              pipeline.customer,
              pipeline.ops,
              pipeline.founder,
              pipeline.comms,
            ][i];
            const isDone = !!data;
            const isActive =
              status.state === "running" && status.current === stageNum;
            return (
              <li
                class={`ot-role ${isDone ? "ot-role--done" : ""} ${isActive ? "ot-role--active" : ""}`}
              >
                <div class="ot-role__head">
                  <span class="ot-role__num">
                    {String(stageNum).padStart(2, "0")}
                  </span>
                  <span class="ot-role__title">{label}</span>
                  <span class="ot-role__status">
                    {isDone ? <Tick /> : isActive ? <Spinner /> : <Pending />}
                  </span>
                </div>
                {isDone && (
                  <div class="ot-role__body">
                    {stageNum === 1 && pipeline.customer && (
                      <CustomerCard r={pipeline.customer} />
                    )}
                    {stageNum === 2 && pipeline.ops && (
                      <OpsCard o={pipeline.ops} />
                    )}
                    {stageNum === 3 && pipeline.founder && (
                      <FounderCard f={pipeline.founder} />
                    )}
                    {stageNum === 4 && pipeline.comms && (
                      <CommsCard c={pipeline.comms} />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <p class="ot__disclaimer">
        Four agents act as four roles on your team — Customer Success, Operations, Founder, Comms — all working off a single event in seconds. Running on Llama 3.3 70B fp8-fast via Cloudflare Workers AI. Free for you to use; real engagements wire this into your inbox, CRM, and tools.
      </p>
    </div>
  );
}

// ---------- per-role cards ----------

function CustomerCard({ r }: { r: CustomerResponse }) {
  const isEmail = r.channel === "email";
  return (
    <div class="ot-card ot-card--email">
      <div class="ot-email">
        <div class="ot-email__head">
          <div class="ot-email__line">
            <span class="ot-email__k">Channel</span>
            <span class="ot-email__v">{CHANNEL_LABEL[r.channel]}</span>
          </div>
          {r.to && (
            <div class="ot-email__line">
              <span class="ot-email__k">To</span>
              <span class="ot-email__v">{r.to}</span>
            </div>
          )}
          {isEmail && r.subject && (
            <div class="ot-email__line">
              <span class="ot-email__k">Subject</span>
              <span class="ot-email__v ot-email__v--strong">{r.subject}</span>
            </div>
          )}
        </div>
        <div class="ot-email__body">{r.body}</div>
      </div>
      <p class="ot-card__note">{r.tone_note}</p>
    </div>
  );
}

function OpsCard({ o }: { o: OpsTasks }) {
  return (
    <ol class="ot-tasks">
      {o.tasks.map((t) => (
        <li class="ot-task">
          <span class="ot-task__check" aria-hidden="true" />
          <div class="ot-task__body">
            <div class="ot-task__title">{t.title}</div>
            <div class="ot-task__meta">
              <span class="ot-pill">{OWNER_LABEL[t.owner_role] ?? t.owner_role}</span>
              <span class="ot-pill ot-pill--when">{t.when}</span>
            </div>
            <div class="ot-task__why">{t.why}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function FounderCard({ f }: { f: FounderNote }) {
  return (
    <div class="ot-card">
      <blockquote class="ot-quote">{f.strategic_angle}</blockquote>
      <div class="ot-founder-row">
        <span class="ot-pl-k">One thing I'll do</span>
        <span class="ot-pl-v">{f.one_action}</span>
      </div>
      {f.tag !== "none" && (
        <div class="ot-tag">
          <span class="ot-tag__label">Tag</span>
          <span class="ot-tag__val">{TAG_LABEL[f.tag] ?? f.tag}</span>
        </div>
      )}
    </div>
  );
}

function CommsCard({ c }: { c: Comms }) {
  return (
    <div class="ot-card">
      <div class="ot-slack">
        <div class="ot-slack__channel">{c.slack.channel}</div>
        <div class="ot-slack__text">{c.slack.text}</div>
      </div>
      {c.external_followup && (
        <div class="ot-followup">
          <span class="ot-pl-k">External follow-up</span>
          <span class="ot-pl-v">{c.external_followup}</span>
        </div>
      )}
    </div>
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
      class="ot-spinner"
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

function Pending() {
  return <span class="ot-role__pending">queued</span>;
}

import { describe, expect, it } from "vitest";
import {
  LeadInput,
  Triage,
  Discovery,
  Scope,
  Pitch,
  ApiError,
} from "../schema.js";

describe("LeadInput", () => {
  it("accepts a 1-char message", () => {
    expect(LeadInput.parse({ lead: "x", ts_token: "tok" })).toEqual({
      lead: "x",
      ts_token: "tok",
    });
  });

  it("trims and accepts a normal lead", () => {
    const result = LeadInput.parse({
      lead: "  seed-stage SaaS  ",
      ts_token: "tok",
    });
    expect(result.lead).toBe("seed-stage SaaS");
  });

  it("rejects empty lead after trim", () => {
    expect(() => LeadInput.parse({ lead: "   ", ts_token: "tok" })).toThrow();
  });

  it("rejects lead longer than 2000 chars", () => {
    expect(() => LeadInput.parse({ lead: "x".repeat(2001), ts_token: "tok" })).toThrow();
  });

  it("rejects missing ts_token", () => {
    expect(() => LeadInput.parse({ lead: "hi" })).toThrow();
  });
});

const validTriage = {
  classification: "mvp_build" as const,
  fit_score: 5 as const,
  entities: {
    company: "Acme",
    stage: "seed",
    team_size: "12",
    industry: "fintech",
    problem: "Need to ship MVP fast.",
    timeline: "6 weeks",
    budget: "$15k",
    tech_mentioned: ["Stripe", "QuickBooks"],
  },
  signals: ["explicit timeline", "explicit budget", "specific integration"],
};

describe("Triage", () => {
  it("accepts a fully valid triage", () => {
    expect(Triage.parse(validTriage)).toEqual(validTriage);
  });

  it("rejects fit_score of 6", () => {
    expect(() => Triage.parse({ ...validTriage, fit_score: 6 })).toThrow();
  });

  it("rejects unknown classification", () => {
    expect(() =>
      Triage.parse({ ...validTriage, classification: "bogus" }),
    ).toThrow();
  });

  it("accepts null entity fields", () => {
    expect(() =>
      Triage.parse({
        ...validTriage,
        entities: { ...validTriage.entities, company: null, stage: null },
      }),
    ).not.toThrow();
  });

  it("rejects empty signals array", () => {
    expect(() => Triage.parse({ ...validTriage, signals: [] })).toThrow();
  });
});

describe("Discovery", () => {
  it("accepts 2 questions", () => {
    expect(() =>
      Discovery.parse({
        questions: [
          { topic: "Data", question: "Where does the data live today?" },
          { topic: "Volume", question: "How many transactions per night?" },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects 1 question (min 2)", () => {
    expect(() =>
      Discovery.parse({
        questions: [{ topic: "x", question: "y" }],
      }),
    ).toThrow();
  });

  it("rejects 5 questions (max 4)", () => {
    expect(() =>
      Discovery.parse({
        questions: Array.from({ length: 5 }, (_, i) => ({
          topic: `t${i}`,
          question: `q${i}`,
        })),
      }),
    ).toThrow();
  });
});

describe("Scope", () => {
  it("accepts a 4-week plan", () => {
    expect(() =>
      Scope.parse({
        weeks: [
          { label: "W1 — discovery", deliverable: "Spec sign-off" },
          { label: "W2 — prototype", deliverable: "Stripe webhook listener" },
          { label: "W3 — integrate", deliverable: "QuickBooks reconcile job" },
          { label: "W4 — ship", deliverable: "Production rollout + handover" },
        ],
        tech_stack: ["Cloudflare Workers", "TypeScript", "D1"],
        effort_pd: "~14 person-days",
        risks: ["QuickBooks rate limits"],
      }),
    ).not.toThrow();
  });

  it("rejects empty tech_stack", () => {
    expect(() =>
      Scope.parse({
        weeks: [
          { label: "W1", deliverable: "x" },
          { label: "W2", deliverable: "y" },
        ],
        tech_stack: [],
        effort_pd: "x",
        risks: [],
      }),
    ).toThrow();
  });
});

describe("Pitch", () => {
  it("accepts a normal reply + next_step", () => {
    expect(() =>
      Pitch.parse({
        reply:
          "Thanks — your Stripe-to-QuickBooks reconciliation work is exactly what we ship. Sending a discovery slot.",
        next_step: "Book a 20-min discovery call",
      }),
    ).not.toThrow();
  });

  it("rejects a reply shorter than 40 chars", () => {
    expect(() =>
      Pitch.parse({ reply: "thanks", next_step: "book a call" }),
    ).toThrow();
  });
});

describe("ApiError", () => {
  it("accepts a well-formed error envelope", () => {
    expect(
      ApiError.parse({ ok: false, error: "rate_limited", message: "Try again." }),
    ).toEqual({ ok: false, error: "rate_limited", message: "Try again." });
  });

  it("rejects ok: true", () => {
    expect(() =>
      ApiError.parse({ ok: true, error: "x", message: "y" }),
    ).toThrow();
  });
});

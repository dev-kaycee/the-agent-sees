import { describe, expect, it } from "vitest";
import { LeadInput, AgentOutput, ApiError } from "../schema.js";

describe("LeadInput", () => {
  it("accepts a 1-char message", () => {
    expect(LeadInput.parse({ lead: "x", ts_token: "tok" })).toEqual({
      lead: "x",
      ts_token: "tok",
    });
  });

  it("trims and accepts a normal lead", () => {
    const result = LeadInput.parse({
      lead: "  Hey, we're a seed-stage SaaS exploring AI.  ",
      ts_token: "tok-abc",
    });
    expect(result.lead).toBe("Hey, we're a seed-stage SaaS exploring AI.");
  });

  it("rejects empty lead after trim", () => {
    expect(() => LeadInput.parse({ lead: "   ", ts_token: "tok" })).toThrow();
  });

  it("rejects lead longer than 2000 chars", () => {
    const tooLong = "x".repeat(2001);
    expect(() => LeadInput.parse({ lead: tooLong, ts_token: "tok" })).toThrow();
  });

  it("rejects missing ts_token", () => {
    expect(() => LeadInput.parse({ lead: "hi" })).toThrow();
  });
});

describe("AgentOutput", () => {
  const valid = {
    classification: "mvp_build" as const,
    priority: 5 as const,
    reasoning: "Strong fit, seed-stage SaaS exploring AI features.",
    suggested_action: "Reply with a 4-week MVP scope proposal.",
    draft_reply: "Thanks for reaching out — this looks like a strong MVP fit. Happy to scope a 4-week build.",
  };

  it("accepts a fully valid output", () => {
    expect(AgentOutput.parse(valid)).toEqual(valid);
  });

  it("rejects priority 2 (only 1, 3, 5 allowed)", () => {
    expect(() => AgentOutput.parse({ ...valid, priority: 2 })).toThrow();
  });

  it("rejects unknown classification", () => {
    expect(() => AgentOutput.parse({ ...valid, classification: "bogus" })).toThrow();
  });

  it("rejects reasoning longer than 200 chars", () => {
    expect(() => AgentOutput.parse({ ...valid, reasoning: "x".repeat(201) })).toThrow();
  });

  it("rejects missing fields", () => {
    const { draft_reply, ...incomplete } = valid;
    expect(() => AgentOutput.parse(incomplete)).toThrow();
  });
});

describe("ApiError", () => {
  it("accepts a well-formed error envelope", () => {
    expect(ApiError.parse({ ok: false, error: "rate_limited", message: "Try again in 60s" })).toEqual({
      ok: false,
      error: "rate_limited",
      message: "Try again in 60s",
    });
  });

  it("rejects ok: true", () => {
    expect(() => ApiError.parse({ ok: true, error: "x", message: "y" })).toThrow();
  });
});

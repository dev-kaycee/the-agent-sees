import { describe, expect, it } from "vitest";
import {
  LeadInput,
  CustomerResponse,
  OpsTasks,
  FounderNote,
  Comms,
  ApiError,
} from "../schema.js";

describe("LeadInput", () => {
  it("trims and accepts a normal lead", () => {
    expect(LeadInput.parse({ lead: "  hello  ", ts_token: "tok" }).lead).toBe(
      "hello",
    );
  });
  it("rejects empty after trim", () => {
    expect(() => LeadInput.parse({ lead: "   ", ts_token: "tok" })).toThrow();
  });
  it("rejects > 2000 chars", () => {
    expect(() =>
      LeadInput.parse({ lead: "x".repeat(2001), ts_token: "tok" }),
    ).toThrow();
  });
  it("rejects missing ts_token", () => {
    expect(() => LeadInput.parse({ lead: "hi" })).toThrow();
  });
});

describe("CustomerResponse", () => {
  const valid = {
    channel: "email" as const,
    to: "Sarah Chen",
    subject: "Welcome to Acme",
    body: "Hi Sarah — thanks for picking us. Here's what happens next.",
    tone_note: "Warm but professional; references her stated use case.",
  };
  it("accepts a valid email response", () => {
    expect(CustomerResponse.parse(valid)).toEqual(valid);
  });
  it("accepts a slack_dm with null subject", () => {
    expect(() =>
      CustomerResponse.parse({ ...valid, channel: "slack_dm", subject: null }),
    ).not.toThrow();
  });
  it("rejects body shorter than 40 chars", () => {
    expect(() =>
      CustomerResponse.parse({ ...valid, body: "thanks" }),
    ).toThrow();
  });
});

describe("OpsTasks", () => {
  const valid = {
    tasks: [
      {
        title: "Create Acme workspace",
        owner_role: "ops" as const,
        when: "today",
        why: "So Sarah can log in tomorrow.",
      },
      {
        title: "Assign CSM Maya",
        owner_role: "csm" as const,
        when: "today",
        why: "Single point of contact.",
      },
      {
        title: "Schedule 30-day check-in",
        owner_role: "csm" as const,
        when: "by Friday",
        why: "Catch issues early.",
      },
    ],
  };
  it("accepts 3 tasks", () => {
    expect(OpsTasks.parse(valid)).toEqual(valid);
  });
  it("rejects 2 tasks (min 3)", () => {
    expect(() =>
      OpsTasks.parse({ tasks: valid.tasks.slice(0, 2) }),
    ).toThrow();
  });
  it("rejects an unknown owner_role", () => {
    expect(() =>
      OpsTasks.parse({
        tasks: [{ ...valid.tasks[0], owner_role: "ceo" as never }],
      }),
    ).toThrow();
  });
});

describe("FounderNote", () => {
  it("accepts a well-formed note", () => {
    expect(() =>
      FounderNote.parse({
        strategic_angle:
          "Acme is the first Pro-plan signup from a 50+ person SaaS this quarter; if we nail this it's a referenceable case study.",
        one_action: "DM Sarah personally in week 2",
        tag: "referenceable_case_study",
      }),
    ).not.toThrow();
  });
  it("rejects an unknown tag", () => {
    expect(() =>
      FounderNote.parse({
        strategic_angle: "x".repeat(50),
        one_action: "y",
        tag: "moonshot" as never,
      }),
    ).toThrow();
  });
});

describe("Comms", () => {
  it("accepts slack + external", () => {
    expect(() =>
      Comms.parse({
        slack: {
          channel: "#wins",
          text: "New Pro customer — Acme Corp, 50ppl B2B SaaS. Sarah Chen is CTO. Maya owns CS.",
        },
        external_followup: "Tweet: 'Welcoming Acme to the studio.'",
      }),
    ).not.toThrow();
  });
  it("accepts null external_followup", () => {
    expect(() =>
      Comms.parse({
        slack: { channel: "#general", text: "x".repeat(30) },
        external_followup: null,
      }),
    ).not.toThrow();
  });
  it("rejects slack text shorter than 20 chars", () => {
    expect(() =>
      Comms.parse({
        slack: { channel: "#x", text: "short" },
        external_followup: null,
      }),
    ).toThrow();
  });
});

describe("ApiError", () => {
  it("accepts a well-formed envelope", () => {
    expect(
      ApiError.parse({ ok: false, error: "rate_limited", message: "wait" }),
    ).toEqual({ ok: false, error: "rate_limited", message: "wait" });
  });
});

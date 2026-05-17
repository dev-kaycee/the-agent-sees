import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkLimit, ipKey, dailyCapKey, type Limiter } from "../rate-limit.js";

/**
 * Minimal in-memory KV mock that matches the subset of KVNamespace methods
 * we use. Not a full Cloudflare mock — just enough for unit tests.
 */
function makeKv(): Limiter {
  const store = new Map<string, { value: string; expiresAt: number | null }>();
  return {
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, opts?: { expirationTtl?: number }) {
      const expiresAt = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null;
      store.set(key, { value, expiresAt });
    },
  };
}

describe("checkLimit (per-IP)", () => {
  let kv: Limiter;

  beforeEach(() => {
    kv = makeKv();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows 5 requests in a minute, blocks the 6th", async () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < 5; i++) {
      const r = await checkLimit(kv, ipKey(ip), 5, 60);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkLimit(kv, ipKey(ip), 5, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets after the window expires", async () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < 5; i++) await checkLimit(kv, ipKey(ip), 5, 60);
    vi.advanceTimersByTime(61_000);
    const r = await checkLimit(kv, ipKey(ip), 5, 60);
    expect(r.allowed).toBe(true);
  });

  it("tracks different IPs independently", async () => {
    await checkLimit(kv, ipKey("1.1.1.1"), 1, 60); // first allowed
    const a = await checkLimit(kv, ipKey("1.1.1.1"), 1, 60); // blocked
    const b = await checkLimit(kv, ipKey("2.2.2.2"), 1, 60); // different IP — allowed
    expect(a.allowed).toBe(false);
    expect(b.allowed).toBe(true);
  });
});

describe("dailyCapKey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rotates daily by date", () => {
    vi.setSystemTime(new Date("2026-05-17T23:59:59Z"));
    const a = dailyCapKey();
    vi.setSystemTime(new Date("2026-05-18T00:00:01Z"));
    const b = dailyCapKey();
    expect(a).not.toBe(b);
    expect(a).toBe("daily:2026-05-17");
    expect(b).toBe("daily:2026-05-18");
  });
});

describe("checkLimit (daily cap)", () => {
  it("blocks after the cap is reached", async () => {
    const kv = makeKv();
    const key = "daily:2026-05-17";
    for (let i = 0; i < 1000; i++) {
      const r = await checkLimit(kv, key, 1000, 86_400);
      expect(r.allowed).toBe(true);
    }
    const blocked = await checkLimit(kv, key, 1000, 86_400);
    expect(blocked.allowed).toBe(false);
  });
});

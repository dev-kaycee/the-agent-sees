/** Minimal interface a KV-like store must satisfy for this module. */
export interface Limiter {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export interface CheckResult {
  allowed: boolean;
  /** Seconds until the window resets if `allowed === false`. */
  retryAfterSeconds: number;
  /** Current count after this check. */
  count: number;
}

/** Build a per-IP key for a given endpoint/feature. */
export function ipKey(ip: string, feature = "demo"): string {
  return `ip:${feature}:${ip}`;
}

/** Build a "daily cap" key that rotates at UTC midnight. */
export function dailyCapKey(feature = "demo"): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${feature === "demo" ? "daily" : `${feature}-daily`}:${today}`;
}

/**
 * Check whether this request is allowed under the given limit/window.
 *
 * On every call we read the current count + window-start from KV, increment
 * if still within the window, and write back with an expiry equal to the
 * remaining window time. If we're at or above `limit`, we deny.
 *
 * KV is eventually consistent across regions; for our volumes the worst
 * case is a small overshoot, which is fine — the daily cap is generous.
 */
export async function checkLimit(
  kv: Limiter,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<CheckResult> {
  const now = Date.now();
  const raw = await kv.get(key);
  let count = 0;
  let windowStart = now;

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { count: number; windowStart: number };
      if (now - parsed.windowStart < windowSeconds * 1000) {
        count = parsed.count;
        windowStart = parsed.windowStart;
      }
    } catch {
      // Corrupt value — reset.
    }
  }

  if (count >= limit) {
    const elapsedMs = now - windowStart;
    const remainingMs = windowSeconds * 1000 - elapsedMs;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)),
      count,
    };
  }

  count += 1;
  // Cloudflare KV requires expirationTtl >= 60. Clamp to that floor so per-IP
  // refreshes mid-window don't reject. The stored `windowStart` is the source
  // of truth for "are we still in the window?" — the TTL is just GC.
  const remainingSeconds = Math.max(60, windowSeconds - Math.floor((now - windowStart) / 1000));

  await kv.put(key, JSON.stringify({ count, windowStart }), {
    expirationTtl: remainingSeconds,
  });

  return { allowed: true, retryAfterSeconds: 0, count };
}

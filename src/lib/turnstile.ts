export interface TurnstileResult {
  success: boolean;
  /** Cloudflare's error codes when success is false. See:
   * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/#error-codes
   */
  errorCodes: string[];
}

/**
 * Verify a Cloudflare Turnstile token against siteverify.
 * Returns `{ success: true, errorCodes: [] }` on success,
 * `{ success: false, errorCodes: [...] }` with reason codes on failure.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<TurnstileResult> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let res: Response;
  try {
    res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return { success: false, errorCodes: ["network-error"] };
  }

  if (!res.ok) {
    return { success: false, errorCodes: [`http-${res.status}`] };
  }

  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  return {
    success: json.success === true,
    errorCodes: json["error-codes"] ?? [],
  };
}

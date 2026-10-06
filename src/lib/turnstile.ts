interface TurnstileResult {
  success: boolean;
  "error-codes"?: string[];
}

/**
 * Server-side Cloudflare Turnstile verification (spec §5).
 * In non-production, if keys are missing we skip verification with a
 * warning so local development works without a Turnstile widget setup.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY not set — skipping verification (dev only).",
      );
      return true;
    }
    console.error("[turnstile] TURNSTILE_SECRET_KEY is not configured.");
    return false;
  }

  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteIp && remoteIp !== "unknown" ? { remoteip: remoteIp } : {}),
        }),
        cache: "no-store",
      },
    );
    const data = (await res.json()) as TurnstileResult;
    if (!data.success) {
      console.warn("[turnstile] verification failed:", data["error-codes"]);
    }
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification request failed:", err);
    return false;
  }
}

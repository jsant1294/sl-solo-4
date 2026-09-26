import { createHmac } from "node:crypto";

/**
 * Client-IP pseudonymization for physical touchpoint analytics.
 *
 * The visitor's address is never stored. We persist a keyed HMAC-SHA256 so we can
 * reason about "same device vs. different device" and spot abuse without holding a
 * reversible identifier, using the same AUTH_SECRET the rest of the app already
 * relies on (identical pattern to the lead-submission fingerprint).
 */

/**
 * Resolves the client address from proxy headers using the repo's established,
 * already-proven normalization (see src/app/api/leads/route.ts). Returns null rather
 * than a placeholder: a missing address is not a value to hash.
 */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = headers.get("x-real-ip")?.trim() || forwarded;
  return address ? address : null;
}

/**
 * Keyed HMAC-SHA256 of the client IP, or null.
 *
 * Returns null — never a throw, never a fallback hash — when the address is absent
 * or AUTH_SECRET is missing/blank. Deliberately does NOT hash the literal string
 * "unknown": that would silently collapse every address-less visitor into one
 * shared "same person" bucket.
 */
export function hashClientIp(headers: Headers): string | null {
  const address = clientIpFromHeaders(headers);
  if (!address) return null;
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(address).digest("hex");
}

/** Hard cap applied before persistence so a hostile/synthetic UA can't bloat the row. */
export const USER_AGENT_MAX_LENGTH = 256;

export function normalizeUserAgent(headers: Headers): string | null {
  const ua = headers.get("user-agent")?.trim();
  if (!ua) return null;
  return ua.length > USER_AGENT_MAX_LENGTH ? ua.slice(0, USER_AGENT_MAX_LENGTH) : ua;
}

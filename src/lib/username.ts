/**
 * Username rules for /u/[username]
 * - lowercase, a-z 0-9 and single hyphens/underscores
 * - 3–30 chars, no leading/trailing separator
 * - reserved terms blocked
 */

export const RESERVED = new Set([
  "admin", "api", "app", "auth", "join", "login", "logout", "signup",
  "hardware", "activate", "upgrade", "profile", "u", "settings", "help",
  "support", "about", "terms", "privacy", "snaplink", "solo", "business",
  "sl", "www", "root", "system", "null", "undefined", "me", "you",
  "dashboard", "home", "checkout", "order", "orders", "device", "devices",
]);

const VALID = /^[a-z0-9]([a-z0-9_-]{1,28})[a-z0-9]$/;

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/[-_]{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

export type UsernameCheck =
  | { ok: true; value: string }
  | { ok: false; reason: "too_short" | "too_long" | "invalid" | "reserved" };

export function checkUsername(raw: string): UsernameCheck {
  const value = normalizeUsername(raw);
  if (value.length < 3) return { ok: false, reason: "too_short" };
  if (value.length > 30) return { ok: false, reason: "too_long" };
  if (!VALID.test(value)) return { ok: false, reason: "invalid" };
  if (RESERVED.has(value)) return { ok: false, reason: "reserved" };
  return { ok: true, value };
}

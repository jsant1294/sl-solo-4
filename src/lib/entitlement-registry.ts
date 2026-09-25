/**
 * KNOWN_ENTITLEMENTS — the canonical registry of SOFTWARE CAPABILITIES a product/bundle can
 * grant. Deliberately contains nothing about commerce: no prices, no product/bundle IDs, no
 * hardware assumptions — just "what capability is this." Products sell capabilities; features
 * check capabilities via hasEntitlement(). Adding a future capability is exactly one entry
 * here — it becomes selectable in the CMS (src/app/operator/products/[id]/page.tsx) with no
 * other code change. See docs/COMMERCE.md "Multi-entitlement commerce foundation".
 *
 * Kept in its own zero-dependency module (not src/lib/entitlements.ts, which imports the DB
 * repo) so src/db/repo.ts can validate against it without creating a circular import.
 */
export const KNOWN_ENTITLEMENTS = [
  { key: "solo_networking", label: "Networking", description: "Business-card OCR + Networking Leads" },
  { key: "solo_resume", label: "Professional / Resume", description: "Structured Resume / Professional identity" },
] as const;
export type KnownEntitlementKey = typeof KNOWN_ENTITLEMENTS[number]["key"];

export function isKnownEntitlementKey(key: string): key is KnownEntitlementKey {
  return KNOWN_ENTITLEMENTS.some((e) => e.key === key);
}

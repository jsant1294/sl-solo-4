import { db } from "@/db";
import { repo } from "@/db/repo";
import { KNOWN_ENTITLEMENTS } from "./entitlement-registry";

/**
 * ENTITLEMENTS — the single choke point for perpetual, non-subscription feature
 * unlocks (e.g. "solo_networking" from the Networking Kit purchase). Every gated
 * feature (Resume, Business Card Scanner) MUST check hasEntitlement() here rather
 * than inspecting orders/products directly. No DB = no entitlements (demo mode
 * has no purchase history to grant from).
 */
export const ENTITLEMENT_SOLO_NETWORKING: string = KNOWN_ENTITLEMENTS[0].key;
export const RESUME_ENTITLEMENT_KEY = KNOWN_ENTITLEMENTS[1].key;

export async function hasEntitlement(userId: string | null | undefined, key: string): Promise<boolean> {
  if (!db) return false;
  return repo.entitlements.has(userId, key);
}

export async function grantEntitlement(userId: string, key: string, sourceOrderId?: string | null): Promise<void> {
  if (!db) return;
  await repo.entitlements.grant(userId, key, sourceOrderId);
}

/**
 * A CMS-configurable "required entitlement" that may be NULL (free). Used by Resume (Phase
 * 3), which deliberately does not hardcode a required key — the operator decides, and NULL
 * always means open access. Pure/sync so it's trivially unit-testable on its own.
 */
export function meetsEntitlementRequirement(requiredKey: string | null | undefined, granted: boolean): boolean {
  return !requiredKey || granted;
}

/**
 * Only a "paid" order ever qualifies for entitlement materialization — pending/failed/refunded
 * orders must not grant capabilities. Used both by the webhook's direct-purchase path and by
 * the guest-order-linking backfill in /app/onboarding, so both paths apply the identical rule.
 */
export function shouldMaterializeEntitlementsFor(paymentState: string): boolean {
  return paymentState === "paid";
}

export { KNOWN_ENTITLEMENTS, isKnownEntitlementKey, type KnownEntitlementKey } from "./entitlement-registry";

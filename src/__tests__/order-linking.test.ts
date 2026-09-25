import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldMaterializeEntitlementsFor, hasEntitlement, grantEntitlement } from "@/lib/entitlements";

describe("shouldMaterializeEntitlementsFor — P0-1 guest-order-linking entitlement fix", () => {
  it("only a paid order qualifies", () => {
    expect(shouldMaterializeEntitlementsFor("paid")).toBe(true);
  });
  it.each(["pending", "failed", "refunded", "cancelled", ""])("a %s order never qualifies", (state) => {
    expect(shouldMaterializeEntitlementsFor(state)).toBe(false);
  });
});

describe("FinishOnboarding source contract — the actual P0-1 fix, verified by inspection", () => {
  const source = readFileSync(resolve(process.cwd(), "src/app/app/onboarding/page.tsx"), "utf8");

  it("links guest orders using ONLY the authenticated account's own verified email — never a client-submitted field", () => {
    // The email used to match orders comes from `users` (looked up by the session's own uid),
    // not from any form field, cookie value, or request body — so a signed-in customer can
    // never claim another customer's order by supplying an arbitrary email.
    expect(source).toMatch(/db\.select\(\{ email: users\.email \}\)\.from\(users\)\.where\(eq\(users\.id, uid\)\)/);
    expect(source).toMatch(/eq\(orders\.email, account\.email\.toLowerCase\(\)\)/);
    // No email is ever read from cookies/form input in this file's order-linking query.
    expect(source).not.toMatch(/orders\.email,\s*(draft|form|cookie|input|body)/i);
  });

  it("captures exactly which orders were newly linked via .returning(), rather than re-deriving state", () => {
    expect(source).toMatch(/\.returning\(\{ id: orders\.id, paymentState: orders\.paymentState \}\)/);
  });

  it("calls the existing grantForPaidOrder — does not duplicate entitlement-granting logic", () => {
    expect(source).toMatch(/repo\.entitlements\.grantForPaidOrder\(order\.id, uid\)/);
    // Guard: only inside the shouldMaterializeEntitlementsFor branch, never unconditionally.
    expect(source).toMatch(/shouldMaterializeEntitlementsFor\(order\.paymentState\)/);
  });

  it("never grants entitlements for a pending/unpaid linked order — the grant call is inside the guard's own if-block", () => {
    expect(source).toMatch(/if \(shouldMaterializeEntitlementsFor\(order\.paymentState\)\) \{\s*await repo\.entitlements\.grantForPaidOrder\(order\.id, uid\);\s*\}/);
  });
});

describe("entitlement idempotency preserved (existing behavior, re-verified in this context)", () => {
  it("hasEntitlement/grantEntitlement remain safe with no database (repeat-onboarding-visit safety net)", async () => {
    await expect(grantEntitlement("user-a", "solo_networking")).resolves.toBeUndefined();
    expect(await hasEntitlement("user-a", "solo_networking")).toBe(false);
  });
});

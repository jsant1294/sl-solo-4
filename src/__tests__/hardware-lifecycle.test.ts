import { describe, expect, it } from "vitest";
import { assignmentError, canResolvePhysicalDevice, claimError, classifyUnresolvedTouchpoint, fulfillmentIssueForPaidOrder, isValidDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";
import { priceCart } from "@/lib/cart";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const assignable = {
  paymentState: "paid", fulfillmentState: "production", fulfillmentIssue: null,
  orderUserId: "user-a", itemDeviceId: null, deviceStatus: "unclaimed" as const,
  deviceAssignedUserId: null, deviceOrderItemId: null,
  expectedProductId: "prod_card", deviceProductId: "prod_card",
  expectedVariantId: "v_card_obs", deviceVariantId: "v_card_obs",
  expectedDeviceType: "card", deviceType: "card",
};

describe("physical device provisioning contract", () => {
  it("fulfillment assigns existing inventory and never creates a device", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/operator/fulfillment-actions.ts"), "utf8");
    expect(source).toContain("repo.devices.assignExisting");
    expect(source).not.toContain("repo.devices.create");
  });
  it("canonicalizes scanned and manually entered codes identically", () => {
    expect(normalizeDeviceCode(" sl-ab_cd-12 ")).toBe("SL-AB_CD-12");
    expect(isValidDeviceCode(" sl-ab_cd-12 ")).toBe(true);
    expect(isValidDeviceCode("bad/code")).toBe(false);
  });
  it("accepts an existing compatible device for a paid linked order", () => expect(assignmentError(assignable)).toBeNull());
  it("rejects a nonexistent device", () => expect(assignmentError({ ...assignable, deviceStatus: undefined })).toBe("Device code not found"));
  it("rejects unpaid orders", () => expect(assignmentError({ ...assignable, paymentState: "pending" })).toBe("Order is not paid"));
  it("rejects unlinked guest orders", () => expect(assignmentError({ ...assignable, orderUserId: null })).toBe("Order is not linked to a customer account"));
  it("rejects fulfillment issues", () => expect(assignmentError({ ...assignable, fulfillmentIssue: "shipping_address_missing" })).toBe("Order has a fulfillment issue"));
  it("rejects an already linked item", () => expect(assignmentError({ ...assignable, itemDeviceId: "device-1" })).toBe("Order item already has a device"));
  it("rejects assigned or activated inventory", () => expect(assignmentError({ ...assignable, deviceStatus: "assigned" })).toBe("Device is not available for assignment"));
  it("rejects incompatible product, variant, and device type", () => {
    expect(assignmentError({ ...assignable, deviceProductId: "other" })).toMatch(/product/);
    expect(assignmentError({ ...assignable, deviceVariantId: "other" })).toMatch(/variant/);
    expect(assignmentError({ ...assignable, deviceType: "bracelet" })).toMatch(/type/);
  });
});

describe("customer activation contract", () => {
  it("allows the assigned user to claim an assigned device", () => expect(claimError({ exists: true, assignedUserId: "user-a", userId: "user-a", status: "assigned" })).toBeNull());
  it("rejects the wrong user", () => expect(claimError({ exists: true, assignedUserId: "user-a", userId: "user-b", status: "assigned" })).toMatch(/not assigned/));
  it("rejects an invented code", () => expect(claimError({ exists: false, userId: "user-a" })).toBe("Device code not found"));
  it("returns a deterministic result for an activated device", () => expect(claimError({ exists: true, assignedUserId: "user-a", userId: "user-a", status: "paired" })).toBe("Device already claimed"));
  it("permits only one status transition in two sequential claim attempts", () => {
    let status: "assigned" | "paired" = "assigned";
    const attempt = () => { const error = claimError({ exists: true, assignedUserId: "user-a", userId: "user-a", status }); if (!error) status = "paired"; return error; };
    expect([attempt(), attempt()]).toEqual([null, "Device already claimed"]);
  });
});

describe("physical resolver contract", () => {
  it("resolves only activated devices with active destination and profile", () => expect(canResolvePhysicalDevice({ status: "paired", destinationActive: true, profileStatus: "active" })).toBe(true));
  it.each(["unclaimed", "assigned", "disabled", "lost", "replaced"] as const)("rejects %s devices", (status) => expect(canResolvePhysicalDevice({ status, destinationActive: true, profileStatus: "active" })).toBe(false));
  it("rejects disabled destinations and profiles", () => {
    expect(canResolvePhysicalDevice({ status: "paired", destinationActive: false, profileStatus: "active" })).toBe(false);
    expect(canResolvePhysicalDevice({ status: "paired", destinationActive: true, profileStatus: "disabled" })).toBe(false);
  });
});

describe("hardware purchase snapshots and shipping safety", () => {
  it("prices a hardware order with stable product, variant, and SKU identity", async () => {
    const result = await priceCart([{ productId: "prod_card", variantId: "v_card_obs", quantity: 1 }]);
    expect(result.rows[0]).toMatchObject({ hardwareProductId: "prod_card", hardwareVariantId: "v_card_obs", sku: "CARD-OBS", productName: "NFC Card", variantLabel: "Obsidian", unitPrice: 2900 });
  });
  it("places a paid physical order on hold when shipping persistence fails", () => expect(fulfillmentIssueForPaidOrder(true, false)).toBe("shipping_address_missing"));
  it("does not place non-shipping orders on hold", () => expect(fulfillmentIssueForPaidOrder(false, false)).toBeNull());
  it("clears the issue after required shipping persists", () => expect(fulfillmentIssueForPaidOrder(true, true)).toBeNull());
});

describe("/t/{deviceCode} unresolved-tap classification (the physical activation dead-end fix)", () => {
  it("keeps an unknown/invalid device code a 404", () => {
    expect(classifyUnresolvedTouchpoint({ deviceExists: false, viewerUserId: null })).toEqual({ kind: "not_found" });
    expect(classifyUnresolvedTouchpoint({ deviceExists: false, viewerUserId: "user-a" })).toEqual({ kind: "not_found" });
  });
  it("routes an unauthenticated visitor of a valid assigned device into the activation journey (sign-in gate handles auth)", () => {
    expect(classifyUnresolvedTouchpoint({ deviceExists: true, status: "assigned", assignedUserId: "user-a", viewerUserId: null }))
      .toEqual({ kind: "needs_activation" });
  });
  it("routes the correctly authenticated owner into the activation journey", () => {
    expect(classifyUnresolvedTouchpoint({ deviceExists: true, status: "assigned", assignedUserId: "user-a", viewerUserId: "user-a" }))
      .toEqual({ kind: "needs_activation" });
  });
  it("never lets a different authenticated account activate someone else's device", () => {
    expect(classifyUnresolvedTouchpoint({ deviceExists: true, status: "assigned", assignedUserId: "user-a", viewerUserId: "user-b" }))
      .toEqual({ kind: "wrong_account" });
  });
  it.each(["unclaimed", "disabled", "lost", "replaced", "paired"] as const)("treats a %s device (unresolved by definition here) as not-found, not an activation invitation", (status) => {
    expect(classifyUnresolvedTouchpoint({ deviceExists: true, status, assignedUserId: "user-a", viewerUserId: "user-a" })).toEqual({ kind: "not_found" });
    expect(classifyUnresolvedTouchpoint({ deviceExists: true, status, assignedUserId: "user-a", viewerUserId: null })).toEqual({ kind: "not_found" });
  });
});

describe("customer hardware page no longer depends on demo fixtures", () => {
  it("does not import DEMO_DEVICES", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/app/hardware/page.tsx"), "utf8");
    expect(source).not.toMatch(/DEMO_DEVICES/);
    expect(source).toMatch(/byAssignedUser/);
  });
  it("scopes the dashboard's device summary to the signed-in user's own devices, not demo fixtures", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/app/page.tsx"), "utf8");
    expect(source).not.toMatch(/DEMO_DEVICES/);
    expect(source).toMatch(/byAssignedUser/);
  });
});

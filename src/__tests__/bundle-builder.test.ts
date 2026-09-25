import { describe, it, expect } from "vitest";
import { validateBundleSlots, slotKeyFromLabel, bundleAvailabilityWarnings, type BundleComponentProduct } from "@/lib/bundle-validation";

function product(overrides: Partial<BundleComponentProduct> & { id: string }): BundleComponentProduct {
  return { name: "Product", productType: "card", variants: [], ...overrides };
}

describe("slotKeyFromLabel — auto-generated, never operator-typed", () => {
  it("slugifies a label into a key", () => {
    expect(slotKeyFromLabel("Phone Tag", new Set())).toBe("phone_tag");
  });
  it("dedupes collisions deterministically", () => {
    const used = new Set<string>();
    expect(slotKeyFromLabel("Wearable", used)).toBe("wearable");
    expect(slotKeyFromLabel("Wearable", used)).toBe("wearable_2");
    expect(slotKeyFromLabel("Wearable", used)).toBe("wearable_3");
  });
  it("falls back to a safe key for a label with no alphanumerics", () => {
    expect(slotKeyFromLabel("!!!", new Set())).toBe("item");
  });
});

describe("validateBundleSlots — structural checks only, never availability", () => {
  const phoneTag = product({ id: "p_phone", name: "Phone Tag" });
  const nfcCard = product({ id: "p_nfc", name: "NFC Card" });
  const braceletVariant = product({ id: "p_bracelet", name: "Bracelet", variants: [{ id: "v_3d", label: "3D Printed" }, { id: "v_leather", label: "Leather" }] });
  const nestedBundle = product({ id: "p_other_bundle", name: "Other Kit", productType: "bundle" });
  const catalog = new Map([phoneTag, nfcCard, braceletVariant, nestedBundle].map((p) => [p.id, p]));

  it("accepts a well-formed fixed + choice bundle (Networking Kit shape)", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "phone_tag", label: "Phone Tag", options: [{ componentProductId: "p_phone", componentVariantId: null }] },
      { slotKey: "nfc_card", label: "NFC Card", options: [{ componentProductId: "p_nfc", componentVariantId: null }] },
      { slotKey: "wearable", label: "Wearable", options: [
        { componentProductId: "p_bracelet", componentVariantId: "v_3d" },
        { componentProductId: "p_bracelet", componentVariantId: "v_leather" },
      ] },
    ], catalog);
    expect(errors).toEqual([]);
  });

  it("rejects an empty bundle", () => {
    expect(validateBundleSlots("bundle_1", [], catalog)).toEqual(["A bundle needs at least one item."]);
  });

  it("rejects a slot with no options", () => {
    const errors = validateBundleSlots("bundle_1", [{ slotKey: "x", label: "Empty", options: [] }], catalog);
    expect(errors.some((e) => e.includes("Empty"))).toBe(true);
  });

  it("rejects self-reference (a bundle including itself)", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Self", options: [{ componentProductId: "bundle_1", componentVariantId: null }] },
    ], catalog);
    expect(errors.some((e) => e.includes("cannot include the bundle itself"))).toBe(true);
  });

  it("rejects nested bundles", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Nested", options: [{ componentProductId: "p_other_bundle", componentVariantId: null }] },
    ], catalog);
    expect(errors.some((e) => e.includes("cannot currently contain other bundles"))).toBe(true);
  });

  it("rejects a variant-requiring product left without a variant selection", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Wearable", options: [{ componentProductId: "p_bracelet", componentVariantId: null }] },
    ], catalog);
    expect(errors.some((e) => e.includes("Choose a variant"))).toBe(true);
  });

  it("rejects an invalid variant id for the chosen product", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Wearable", options: [{ componentProductId: "p_bracelet", componentVariantId: "v_nonexistent" }] },
    ], catalog);
    expect(errors.some((e) => e.includes("invalid variant"))).toBe(true);
  });

  it("rejects a reference to a product that no longer exists", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Ghost", options: [{ componentProductId: "p_missing", componentVariantId: null }] },
    ], catalog);
    expect(errors.some((e) => e.includes("no longer exists"))).toBe(true);
  });

  it("rejects duplicate slot keys", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "dup", label: "A", options: [{ componentProductId: "p_phone", componentVariantId: null }] },
      { slotKey: "dup", label: "B", options: [{ componentProductId: "p_nfc", componentVariantId: null }] },
    ], catalog);
    expect(errors.some((e) => e.includes("Duplicate bundle item key"))).toBe(true);
  });

  it("rejects a duplicate product/variant option within one slot", () => {
    const errors = validateBundleSlots("bundle_1", [
      { slotKey: "x", label: "Wearable", options: [
        { componentProductId: "p_bracelet", componentVariantId: "v_3d" },
        { componentProductId: "p_bracelet", componentVariantId: "v_3d" },
      ] },
    ], catalog);
    expect(errors.some((e) => e.includes("duplicate product/variant"))).toBe(true);
  });
});

describe("bundleAvailabilityWarnings — non-blocking, surfaces impossible configurations", () => {
  it("warns when every option in a slot is unavailable", () => {
    const warnings = bundleAvailabilityWarnings([
      { label: "Wearable", options: [
        { product: { active: false, stockStatus: "in_stock" } },
        { product: { active: true, stockStatus: "out_of_stock" } },
      ] },
    ]);
    expect(warnings).toEqual(['This bundle currently has no available "Wearable" choices.']);
  });

  it("does not warn when at least one option is available", () => {
    const warnings = bundleAvailabilityWarnings([
      { label: "Wearable", options: [
        { product: { active: false, stockStatus: "in_stock" } },
        { product: { active: true, stockStatus: "in_stock" } },
      ] },
    ]);
    expect(warnings).toEqual([]);
  });

  it("ignores a slot with no options at all (structural error, not an availability warning)", () => {
    expect(bundleAvailabilityWarnings([{ label: "Empty", options: [] }])).toEqual([]);
  });
});

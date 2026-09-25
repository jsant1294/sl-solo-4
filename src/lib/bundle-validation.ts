/**
 * BUNDLE VALIDATION — pure, DB-free structural checks shared by the operator Bundle Builder
 * server actions (src/app/operator/products/actions.ts). Kept dependency-free (no repo import)
 * so it's trivially unit-testable, matching the pattern of src/lib/entitlement-registry.ts.
 */

export interface BundleComponentProduct {
  id: string;
  name: string;
  productType: string;
  variants: { id: string; label: string }[];
}

export interface BundleOptionInput {
  componentProductId: string;
  componentVariantId: string | null;
}

export interface BundleSlotInput {
  slotKey: string;
  label: string;
  options: BundleOptionInput[];
}

/**
 * Structural validation only — name/slug/price are validated by saveProduct's own zod schema.
 * Never trusts anything about availability (active/stock) here; that's a separate, non-blocking
 * warning surfaced by bundleAvailabilityWarnings, computed fresh on every page load, never
 * gating whether a draft can be saved.
 */
export function validateBundleSlots(
  bundleProductId: string,
  slots: BundleSlotInput[],
  productsById: Map<string, BundleComponentProduct>,
): string[] {
  const errors: string[] = [];
  if (!slots.length) errors.push("A bundle needs at least one item.");
  const seenSlotKeys = new Set<string>();
  for (const slot of slots) {
    const name = slot.label.trim() || "(unnamed item)";
    if (!slot.label.trim()) errors.push("Every bundle item needs a name.");
    if (seenSlotKeys.has(slot.slotKey)) errors.push(`Duplicate bundle item key: ${slot.slotKey}.`);
    seenSlotKeys.add(slot.slotKey);
    if (!slot.options.length) { errors.push(`"${name}" needs at least one product selected.`); continue; }
    const seenOptions = new Set<string>();
    for (const opt of slot.options) {
      if (!opt.componentProductId) { errors.push(`"${name}" has an empty product selection.`); continue; }
      if (opt.componentProductId === bundleProductId) { errors.push(`"${name}" cannot include the bundle itself.`); continue; }
      const product = productsById.get(opt.componentProductId);
      if (!product) { errors.push(`"${name}" references a product that no longer exists.`); continue; }
      if (product.productType === "bundle") { errors.push(`"${name}": bundles cannot currently contain other bundles.`); continue; }
      if (product.variants.length > 0 && !opt.componentVariantId) { errors.push(`Choose a variant for "${product.name}" in "${name}".`); continue; }
      if (opt.componentVariantId && !product.variants.some((v) => v.id === opt.componentVariantId)) { errors.push(`"${product.name}" in "${name}" has an invalid variant selection.`); continue; }
      const dedupeKey = `${opt.componentProductId}:${opt.componentVariantId ?? ""}`;
      if (seenOptions.has(dedupeKey)) { errors.push(`"${name}" has a duplicate product/variant option.`); continue; }
      seenOptions.add(dedupeKey);
    }
  }
  return errors;
}

/** Auto-generates a stable, human-free slot key from the operator's label — never operator-typed. */
export function slotKeyFromLabel(label: string, used: Set<string>): string {
  const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
  let key = base;
  let n = 2;
  while (used.has(key)) { key = `${base}_${n}`; n++; }
  used.add(key);
  return key;
}

interface AvailabilitySlot {
  label: string;
  options: Array<{
    product?: { active: boolean; stockStatus: string } | null;
    variant?: { stockStatus: string } | null;
  }>;
}

/** Non-blocking — a bundle can be saved/active with these warnings; they just flag that it's
 * currently unpurchasable (the real purchase-time block already happens in addBundleToCart). */
export function bundleAvailabilityWarnings(slots: AvailabilitySlot[]): string[] {
  const warnings: string[] = [];
  for (const slot of slots) {
    if (!slot.options.length) continue;
    const anyAvailable = slot.options.some((o) => o.product?.active && (o.variant?.stockStatus ?? o.product?.stockStatus) !== "out_of_stock");
    if (!anyAvailable) warnings.push(`This bundle currently has no available "${slot.label}" choices.`);
  }
  return warnings;
}

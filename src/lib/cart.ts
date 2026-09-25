import { cookies } from "next/headers";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { getProductById } from "@/db/commerce-demo";

/**
 * CART — cookie-backed so it works pre-auth. STUBBED persistence (a cookie,
 * not a DB cart). Shape is stable; swap the storage for a DB cart at wire time.
 */
export interface CartLine {
  productId: string;
  variantId: string | null;
  personalization?: string;
  customArt?: boolean;
  customArtNotes?: string;
  customArtFileUrl?: string;
  quantity: number;
  /** Shared by every line added together from one bundle "add to cart" action (e.g. the
   * Networking Kit). Absent for ordinary single-item lines. bundleProductId identifies
   * which bundle product to re-validate/reprice this group against — never trusted for
   * price or entitlement directly; priceCart re-derives both from the DB. */
  bundleGroupId?: string;
  bundleProductId?: string;
  bundleSlotKey?: string;
}
export class CartValidationError extends Error {}
const COOKIE = "sl_cart";

export async function readCart(): Promise<CartLine[]> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return [];
  try {
    const parsed = JSON.parse(c);
    return Array.isArray(parsed) ? parsed.slice(0, 20) as CartLine[] : [];
  } catch { return []; }
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(lines), {
    httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCart(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

type PricedRow = Awaited<ReturnType<typeof priceSingleLine>>;

async function priceSingleLine(l: CartLine, priceOverrideCents: number | null, grantsEntitlement: string | null, entitlementGrants: string[] = []) {
  if (!l || typeof l.productId !== "string" || !Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 10) throw new CartValidationError("Invalid cart quantity");
  const p = db ? await repo.products.byId(l.productId) : getProductById(l.productId);
  if (!p || !p.active) throw new CartValidationError("A cart product is no longer available");
  const v = p.variants.find((x) => x.id === l.variantId);
  if (p.variants.length > 0 && !v) throw new CartValidationError("Choose a valid product option");
  if (v?.stockStatus === "out_of_stock") throw new CartValidationError("A selected product option is out of stock");
  const personalization = typeof l.personalization === "string" ? l.personalization.trim() : "";
  if (personalization.length > 20 || (personalization && !p.personalizationAvailable)) throw new CartValidationError("Invalid personalization");
  const customArtNotes = typeof l.customArtNotes === "string" ? l.customArtNotes.trim() : "";
  const customArtFileUrl = typeof l.customArtFileUrl === "string" ? l.customArtFileUrl.trim() : "";
  const customArt = Boolean(l.customArt);
  if (customArt && (!p.customArtAvailable || p.customArtPriceCents === null)) throw new CartValidationError("Custom artwork isn't available for this product");
  if (customArtNotes.length > 500 || (customArtNotes && !customArt)) throw new CartValidationError("Invalid custom artwork request");
  if (customArtFileUrl && (!customArt || customArtFileUrl.length > 600 || !/^https:\/\//.test(customArtFileUrl))) throw new CartValidationError("Invalid custom artwork file");
  const customArtPriceCents = customArt ? p.customArtPriceCents : null;
  const unit = priceOverrideCents ?? (p.basePrice + (v?.priceDelta ?? 0) + (customArtPriceCents ?? 0));
  if (!Number.isInteger(unit) || unit < 0) throw new CartValidationError("Invalid product price");
  return {
    productId: p.id, variantId: v?.id ?? null, personalization: personalization || undefined, quantity: l.quantity,
    customArtPriceCents, customArtNotes: customArt && customArtNotes ? customArtNotes : undefined,
    customArtFileUrl: customArt && customArtFileUrl ? customArtFileUrl : undefined,
    productName: p.name,
    variantLabel: v?.label ?? null,
    sku: v?.sku ?? null,
    hardwareProductId: p.id,
    hardwareVariantId: v?.id ?? null,
    productType: p.productType,
    grantsEntitlement,
    entitlementGrants,
    bundleGroupId: l.bundleGroupId ?? null,
    bundleProductId: l.bundleProductId ?? null,
    bundleSlotKey: l.bundleSlotKey ?? null,
    unitPrice: unit,
    lineTotal: unit * l.quantity,
  };
}

/**
 * Re-validates one bundle group against the bundle product's slot definitions, fetched
 * fresh from the DB (never trusting the cart cookie for price or entitlement). Returns
 * priced rows with the bundle's total price on the first slot and 0 on the rest.
 *
 * Software entitlements belong to the BUNDLE PURCHASE as a whole, not independently to
 * every physical component inside it — so the bundle's full effective grant set (legacy
 * scalar + new multi-grant config, unioned) is stamped ONLY on that first "entitlement
 * carrier" row, exactly like its price. It must never be duplicated across the other
 * physical component lines, or a single $99 purchase would (incorrectly) look like N
 * separate entitlement grants downstream.
 */
async function priceBundleGroup(groupLines: CartLine[]): Promise<PricedRow[]> {
  const bundleProductId = groupLines[0]?.bundleProductId;
  if (!db || !bundleProductId) throw new CartValidationError("This bundle requires online checkout");
  const bundle = await repo.products.byId(bundleProductId);
  if (!bundle || !bundle.active || bundle.productType !== "bundle") throw new CartValidationError("This kit is no longer available");
  const slots = await repo.products.bundleSlots(bundleProductId);
  if (!slots.length) throw new CartValidationError("This kit is not configured correctly");
  if (groupLines.length !== slots.length || groupLines.some((l) => l.quantity !== 1)) throw new CartValidationError("This kit's selection is invalid — please re-add it");

  const remaining = [...groupLines];
  const ordered: CartLine[] = [];
  for (const slot of slots) {
    const idx = remaining.findIndex((l) => l.bundleSlotKey === slot.slotKey
      && slot.options.some((opt) => opt.componentProductId === l.productId && opt.componentVariantId === l.variantId));
    if (idx === -1) throw new CartValidationError("This kit's selection is invalid — please re-add it");
    ordered.push(remaining[idx]);
    remaining.splice(idx, 1);
  }

  const bundleGrants = await repo.products.effectiveEntitlementGrants(bundleProductId);
  return Promise.all(ordered.map((l, i) => priceSingleLine(l, i === 0 ? bundle.basePrice : 0, i === 0 ? bundle.grantsEntitlement ?? null : null, i === 0 ? bundleGrants : [])));
}

/** Resolve cart lines to priced rows for display/checkout. DB when wired. */
export async function priceCart(lines: CartLine[]) {
  const singles = lines.filter((l) => !l.bundleGroupId);
  const groups = new Map<string, CartLine[]>();
  for (const l of lines) {
    if (!l.bundleGroupId) continue;
    const arr = groups.get(l.bundleGroupId) ?? [];
    arr.push(l);
    groups.set(l.bundleGroupId, arr);
  }

  const rows: PricedRow[] = [];
  for (const l of singles) {
    const grants = db ? await repo.products.effectiveEntitlementGrants(l.productId) : [];
    rows.push(await priceSingleLine(l, null, null, grants));
  }
  for (const groupLines of groups.values()) rows.push(...(await priceBundleGroup(groupLines)));

  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  return { rows, subtotal, count: rows.reduce((s, r) => s + r.quantity, 0) };
}

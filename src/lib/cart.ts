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

/** Resolve cart lines to priced rows for display/checkout. DB when wired. */
export async function priceCart(lines: CartLine[]) {
  const rows = await Promise.all(lines.map(async (l) => {
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
    const unit = p.basePrice + (v?.priceDelta ?? 0) + (customArtPriceCents ?? 0);
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
      unitPrice: unit,
      lineTotal: unit * l.quantity,
    };
  }));
  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  return { rows, subtotal, count: rows.reduce((s, r) => s + r.quantity, 0) };
}

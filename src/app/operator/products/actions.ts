"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";
import { storage } from "@/lib/providers";
import { validateBundleSlots, slotKeyFromLabel, type BundleComponentProduct } from "@/lib/bundle-validation";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (value: string) => value || null;
const list = (value: string) => value.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

const PRODUCT_TYPES = ["phone_plate", "card", "stand", "sticker", "bracelet", "keychain", "bundle"] as const;

function failNewProduct(message: string): never {
  redirect(`/operator/products/new?error=${encodeURIComponent(message)}`);
}

/**
 * Creates a bare product record (name/slug/type/price only) so it appears in the catalog
 * and can immediately be opened in the full editor (saveProduct) to fill in copy, media,
 * variants, purpose tags, etc. Mirrors the create-then-edit pattern used for profiles
 * (src/app/operator/profiles/actions.ts createOperatorProfile).
 */
export async function createProduct(form: FormData): Promise<void> {
  await requireOperator();
  const name = text(form, "name");
  const slug = text(form, "slug");
  const productType = text(form, "productType");
  if (!name) failNewProduct("Product name is required.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) failNewProduct("Slug must be lowercase letters, numbers, and hyphens.");
  if (!(PRODUCT_TYPES as readonly string[]).includes(productType)) failNewProduct("Choose a valid product type.");
  const basePriceRaw = text(form, "basePrice");
  const basePrice = z.coerce.number().int().nonnegative().safeParse(basePriceRaw);
  if (!basePrice.success) failNewProduct("Enter a valid starting price in cents.");

  const existing = await repo.products.bySlug(slug);
  if (existing) failNewProduct("A product with this slug already exists.");

  const product = await repo.products.create({
    name, slug, basePrice: basePrice.data, productType: productType as typeof PRODUCT_TYPES[number],
    shortDescription: nullable(text(form, "shortDescription")),
  });
  revalidatePath("/operator/products");
  redirect(`/operator/products/${product.id}?created=1`);
}

export async function saveProduct(form: FormData) {
  const operatorId = await requireOperator();
  const id = text(form, "id");
  const current = await repo.products.byId(id);
  if (!current) throw new Error("Product not found");
  const parsed = z.object({
    name: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    basePrice: z.coerce.number().int().nonnegative(), sortOrder: z.coerce.number().int(),
  }).parse({ name: text(form, "name"), slug: text(form, "slug"), basePrice: form.get("basePrice"), sortOrder: form.get("sortOrder") });
  const compareAtPrice = text(form, "compareAtPrice") ? z.coerce.number().int().nonnegative().parse(form.get("compareAtPrice")) : null;
  if (compareAtPrice !== null && compareAtPrice < parsed.basePrice) throw new Error("Compare price cannot be lower than the selling price");
  const active = form.get("active") === "on";

  // An incomplete/malformed bundle must never become publicly purchasable — re-run the same
  // structural checks the Bundle Builder itself enforces, against the bundle's currently saved
  // contents, the moment an operator flips it to active. Editing while inactive is unrestricted.
  if (active && current.productType === "bundle") {
    if (parsed.basePrice <= 0) throw new Error("This bundle can't be activated yet: it needs a price greater than $0.");
    const slots = await repo.products.bundleSlots(id);
    const allProducts = await repo.products.list(false);
    const productsById = new Map<string, BundleComponentProduct>(allProducts.map((p) => [p.id, p]));
    const errors = validateBundleSlots(id, slots.map((s) => ({
      slotKey: s.slotKey, label: s.label,
      options: s.options.map((o) => ({ componentProductId: o.componentProductId, componentVariantId: o.componentVariantId })),
    })), productsById);
    if (errors.length) throw new Error(`This bundle can't be activated yet: ${errors.join(" ")}`);
  }

  const variantLines = text(form, "variants").split("\n").map((x) => x.trim()).filter(Boolean);
  const variants = variantLines.map((line, sortOrder) => {
    const [label, color, priceDelta = "0", sku = ""] = line.split("|").map((x) => x.trim());
    const parsedVariant = z.object({ label: z.string().min(1).max(100), priceDelta: z.coerce.number().int() }).parse({ label, priceDelta });
    if (parsed.basePrice + parsedVariant.priceDelta < 0) throw new Error(`Variant ${label} produces a negative price`);
    return { label: parsedVariant.label, color: color || null, priceDelta: parsedVariant.priceDelta, sku: sku || null, sortOrder, stockStatus: "in_stock" as const };
  });

  await repo.products.updateWithVariants(id, operatorId, {
    ...parsed,
    nameEs: nullable(text(form, "nameEs")),
    shortDescription: nullable(text(form, "shortDescription")),
    shortDescriptionEs: nullable(text(form, "shortDescriptionEs")),
    fullDescription: nullable(text(form, "fullDescription")),
    fullDescriptionEs: nullable(text(form, "fullDescriptionEs")),
    compareAtPrice,
    active, featured: form.get("featured") === "on",
    colors: list(text(form, "colors")),
    personalizationAvailable: form.get("personalizationAvailable") === "on",
    personalizationOptions: list(text(form, "personalizationOptions")),
    customArtAvailable: form.get("customArtAvailable") === "on",
    customArtPriceCents: text(form, "customArtPriceCents") ? z.coerce.number().int().nonnegative().parse(form.get("customArtPriceCents")) : null,
    profileTypesSupported: list(text(form, "profileTypesSupported")),
    activationInstructions: nullable(text(form, "activationInstructions")),
    fulfillmentNotes: nullable(text(form, "fulfillmentNotes")),
    seoTitle: nullable(text(form, "seoTitle")), seoDescription: nullable(text(form, "seoDescription")),
    // grantsEntitlement (legacy scalar) is intentionally NOT written here anymore — see
    // saveProductEntitlementGrants below, which is now the only way to edit what a product
    // grants. The legacy column is display-only going forward (read via product.grantsEntitlement).
  }, variants);
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${id}`);
  redirect(`/operator/products/${id}?saved=1`);
}

/**
 * The only way to edit what capabilities a product grants, going forward. Writes exclusively
 * to product_entitlement_grants (the canonical multi-grant config) — never touches the legacy
 * products.grantsEntitlement scalar, which stays as read-only historical/back-compat data.
 * Checkbox values are validated against KNOWN_ENTITLEMENTS inside repo.products.replaceEntitlementGrants,
 * so an operator can never type/inject an arbitrary entitlement key here.
 */
export async function saveProductEntitlementGrants(form: FormData) {
  await requireOperator();
  const id = text(form, "id");
  const keys = form.getAll("entitlementGrants").map((v) => String(v));
  await repo.products.replaceEntitlementGrants(id, keys);
  revalidatePath(`/operator/products/${id}`);
  redirect(`/operator/products/${id}?saved=1`);
}

const bundleOptionSchema = z.object({
  productId: z.string().min(1).max(80),
  variantId: z.string().max(80).nullable(),
});
const bundleSlotSchema = z.object({
  label: z.string().min(1).max(100),
  allowCustomerChoice: z.boolean(),
  options: z.array(bundleOptionSchema).min(1).max(12),
});
const bundleSlotsSchema = z.array(bundleSlotSchema).max(20);

/**
 * Visual Bundle Builder save — replaces the old pipe-delimited slot text field. The client
 * (bundle-builder.tsx) serializes its structured state into the hidden "slotsJson" field;
 * everything here is re-derived/re-validated server-side (slot keys, product/variant
 * existence, self-reference, nested bundles) — the client's JSON is never trusted as-is,
 * only as a shape to validate. Quantity is fixed at 1 per item: cart/checkout (priceBundleGroup
 * in src/lib/cart.ts, addBundleToCart in cart-actions.ts) only support exactly one physical
 * line per slot today — see docs/COMMERCE.md for this audited, deliberately-deferred limit.
 */
export async function saveBundleSlotsStructured(form: FormData) {
  await requireOperator();
  const productId = text(form, "productId");
  const bundle = await repo.products.byId(productId);
  if (!bundle) throw new Error("Product not found");
  if (bundle.productType !== "bundle") throw new Error("Only a bundle-type product can have bundle contents");

  let input: z.infer<typeof bundleSlotsSchema>;
  try {
    input = bundleSlotsSchema.parse(JSON.parse(text(form, "slotsJson") || "[]"));
  } catch {
    throw new Error("Bundle contents were submitted in an invalid format");
  }

  const allProducts = await repo.products.list(false);
  const productsById = new Map<string, BundleComponentProduct>(allProducts.map((p) => [p.id, p]));

  const usedKeys = new Set<string>();
  const slots = input.map((slot) => ({
    slotKey: slotKeyFromLabel(slot.label, usedKeys),
    label: slot.label.trim(),
    quantity: 1,
    allowCustomerChoice: slot.allowCustomerChoice,
    options: slot.options.map((o) => ({ componentProductId: o.productId, componentVariantId: o.variantId })),
  }));

  const errors = validateBundleSlots(productId, slots, productsById);
  if (errors.length) throw new Error(errors.join(" "));

  await repo.products.replaceBundleSlots(productId, slots);
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${productId}`);
  redirect(`/operator/products/${productId}?saved=1`);
}

/**
 * DUPLICATE PRODUCT — copies merchandising copy, variants (SKUs cleared — operator must assign
 * new ones), bundle contents, and capability grants onto a brand-new product/SKU/slug. Always
 * inactive by default. Component products referenced by a duplicated bundle's slots are NEVER
 * duplicated themselves — the copy points at the same real catalog products/variants as the
 * original, exactly like the original bundle does.
 */
export async function duplicateProduct(form: FormData) {
  await requireOperator();
  const id = text(form, "id");
  const source = await repo.products.byId(id);
  if (!source) throw new Error("Product not found");

  let slug = `${source.slug}-copy`;
  let n = 2;
  while (await repo.products.bySlug(slug)) { slug = `${source.slug}-copy-${n}`; n++; }

  const created = await repo.products.create({
    name: `${source.name} Copy`, slug, basePrice: source.basePrice, productType: source.productType,
    nameEs: source.nameEs, shortDescription: source.shortDescription, shortDescriptionEs: source.shortDescriptionEs,
    fullDescription: source.fullDescription, fullDescriptionEs: source.fullDescriptionEs,
    compareAtPrice: source.compareAtPrice, active: false, featured: false, sortOrder: source.sortOrder,
    primaryImageId: source.primaryImageId, galleryImageIds: source.galleryImageIds,
    videoId: source.videoId, videoPosterId: source.videoPosterId,
    colors: source.colors, personalizationAvailable: source.personalizationAvailable,
    personalizationOptions: source.personalizationOptions,
    customArtAvailable: source.customArtAvailable, customArtPriceCents: source.customArtPriceCents,
    profileTypesSupported: source.profileTypesSupported, activationInstructions: source.activationInstructions,
    fulfillmentNotes: source.fulfillmentNotes,
  });

  if (source.variants.length) {
    await repo.products.replaceVariants(created.id, source.variants.map((v) => ({
      label: v.label, color: v.color, priceDelta: v.priceDelta, sku: null, stockStatus: v.stockStatus, sortOrder: v.sortOrder,
    })));
  }

  if (source.productType === "bundle") {
    const slots = await repo.products.bundleSlots(id);
    await repo.products.replaceBundleSlots(created.id, slots.map((s) => ({
      slotKey: s.slotKey, label: s.label, quantity: s.quantity, allowCustomerChoice: s.allowCustomerChoice,
      options: s.options.map((o) => ({ componentProductId: o.componentProductId, componentVariantId: o.componentVariantId })),
    })));
  }

  const grants = await repo.products.entitlementGrants(id);
  if (grants.length) await repo.products.replaceEntitlementGrants(created.id, grants);

  revalidatePath("/operator/products");
  redirect(`/operator/products/${created.id}?created=1`);
}

export async function uploadProductMedia(form: FormData) {
  await requireOperator();
  const productId = text(form, "productId");
  const role = z.enum(["primary", "gallery", "video", "poster"]).parse(text(form, "role"));
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload");
  const expectedVideo = role === "video";
  if (expectedVideo ? !file.type.startsWith("video/") : !file.type.startsWith("image/")) throw new Error(expectedVideo ? "Video required" : "Image required");
  if (file.size > (expectedVideo ? 50 : 12) * 1024 * 1024) throw new Error("File is too large");
  const result = await storage.upload({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  const media = await repo.products.createMedia({ url: result.url, alt: nullable(text(form, "alt")), kind: expectedVideo ? "video" : "image", contentType: file.type, objectPosition: text(form, "objectPosition") || "50% 50%", active: true, storageKey: null, width: null, height: null });
  const product = await repo.products.byId(productId);
  if (!product) throw new Error("Product not found");
  if (role === "primary") await repo.products.update(productId, { primaryImageId: media.id });
  if (role === "gallery") await repo.products.update(productId, { galleryImageIds: [...product.galleryImageIds, media.id] });
  if (role === "video") await repo.products.update(productId, { videoId: media.id });
  if (role === "poster") await repo.products.update(productId, { videoPosterId: media.id });
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${productId}`);
}

export async function removeProductMedia(form: FormData) {
  await requireOperator();
  const productId = text(form, "productId"); const mediaId = text(form, "mediaId");
  const product = await repo.products.byId(productId);
  if (!product) throw new Error("Product not found");
  const item = [product.primaryImage, ...product.galleryImages, product.video, product.videoPoster].find((m) => m?.id === mediaId);
  await repo.products.update(productId, {
    primaryImageId: product.primaryImageId === mediaId ? null : product.primaryImageId,
    galleryImageIds: product.galleryImageIds.filter((id) => id !== mediaId),
    videoId: product.videoId === mediaId ? null : product.videoId,
    videoPosterId: product.videoPosterId === mediaId ? null : product.videoPosterId,
  });
  if (item) await storage.delete(item.url);
  await repo.products.deleteMedia(mediaId);
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${productId}`);
}

export async function arrangeProductMedia(form: FormData) {
  await requireOperator(); const productId = text(form, "productId"); const mediaId = text(form, "mediaId"); const command = z.enum(["primary", "up", "down"]).parse(text(form, "command"));
  const product = await repo.products.byId(productId); if (!product) throw new Error("Product not found");
  let gallery = [...product.galleryImageIds];
  if (command === "primary") {
    gallery = gallery.filter((id) => id !== mediaId);
    if (product.primaryImageId && product.primaryImageId !== mediaId) gallery.unshift(product.primaryImageId);
    await repo.products.update(productId, { primaryImageId: mediaId, galleryImageIds: gallery });
  } else {
    const index = gallery.indexOf(mediaId); const next = command === "up" ? index - 1 : index + 1;
    if (index >= 0 && next >= 0 && next < gallery.length) [gallery[index], gallery[next]] = [gallery[next], gallery[index]];
    await repo.products.update(productId, { galleryImageIds: gallery });
  }
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${productId}`);
}

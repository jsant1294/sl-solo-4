"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";
import { storage } from "@/lib/providers";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (value: string) => value || null;
const list = (value: string) => value.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

export async function saveProduct(form: FormData) {
  const operatorId = await requireOperator();
  const id = text(form, "id");
  const parsed = z.object({
    name: z.string().min(1), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    basePrice: z.coerce.number().int().nonnegative(), sortOrder: z.coerce.number().int(),
  }).parse({ name: text(form, "name"), slug: text(form, "slug"), basePrice: form.get("basePrice"), sortOrder: form.get("sortOrder") });
  const compareAtPrice = text(form, "compareAtPrice") ? z.coerce.number().int().nonnegative().parse(form.get("compareAtPrice")) : null;
  if (compareAtPrice !== null && compareAtPrice < parsed.basePrice) throw new Error("Compare price cannot be lower than the selling price");

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
    active: form.get("active") === "on", featured: form.get("featured") === "on",
    colors: list(text(form, "colors")),
    personalizationAvailable: form.get("personalizationAvailable") === "on",
    personalizationOptions: list(text(form, "personalizationOptions")),
    customArtAvailable: form.get("customArtAvailable") === "on",
    customArtPriceCents: text(form, "customArtPriceCents") ? z.coerce.number().int().nonnegative().parse(form.get("customArtPriceCents")) : null,
    profileTypesSupported: list(text(form, "profileTypesSupported")),
    activationInstructions: nullable(text(form, "activationInstructions")),
    fulfillmentNotes: nullable(text(form, "fulfillmentNotes")),
    seoTitle: nullable(text(form, "seoTitle")), seoDescription: nullable(text(form, "seoDescription")),
  }, variants);
  revalidatePath("/"); revalidatePath("/hardware"); revalidatePath(`/operator/products/${id}`);
  redirect(`/operator/products/${id}?saved=1`);
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

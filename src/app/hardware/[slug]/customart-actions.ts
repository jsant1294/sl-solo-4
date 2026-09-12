"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { storage } from "@/lib/providers";

const RATE_WINDOW_MS = 60 * 60_000;
const RATE_LIMIT = 10;
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Public upload for a Touchpoint Art reference image (a customer's logo/design
 * reference), attached to a cart line before checkout — not an operator upload.
 * Same fingerprint-rate-limit shape as /api/leads.
 */
export async function uploadCustomArtReference(form: FormData): Promise<
  { ok: true; url: string } | { ok: false; error: string }
> {
  if (!db) return { ok: false, error: "Custom artwork upload isn't available in demo mode" };
  const secret = process.env.AUTH_SECRET;
  if (!secret) return { ok: false, error: "Upload is temporarily unavailable" };

  const productId = String(form.get("productId") ?? "").trim();
  const product = await repo.products.byId(productId);
  if (!product || !product.customArtAvailable) return { ok: false, error: "Custom artwork isn't available for this product" };

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload" };
  if (!ALLOWED_TYPES.includes(file.type)) return { ok: false, error: "Upload a PNG, JPEG, or WEBP image" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Image is too large (8MB max)" };

  const h = await headers();
  const address = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const fingerprint = createHmac("sha256", secret).update(address).digest("hex");
  if (await repo.media.countRecentByFingerprint(fingerprint, RATE_WINDOW_MS) >= RATE_LIMIT) {
    return { ok: false, error: "Too many uploads. Please try again later." };
  }

  try {
    const uploaded = await storage.upload({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    await repo.media.create({
      url: uploaded.url, alt: null, kind: "image", storageKey: null, contentType: file.type,
      width: null, height: null, objectPosition: "50% 50%", active: false, fingerprint,
    });
    return { ok: true, url: uploaded.url };
  } catch {
    return { ok: false, error: "Upload failed — please try again" };
  }
}

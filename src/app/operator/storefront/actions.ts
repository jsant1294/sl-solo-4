"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (input: string) => input || null;
const destination = z.string().refine((input) => !input || input.startsWith("/") || /^https:\/\//.test(input), "CTA destination must be a site path or HTTPS URL");

export async function saveStorefrontSection(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    id: z.string().min(1),
    headlineEn: z.string().min(1),
    headlineEs: z.string().min(1),
    ctaHref: destination,
    backgroundTheme: z.enum(["ivory", "sand", "coral", "lavender", "aqua", "sage", "yellow", "charcoal", "pattern"]),
    overlayStrength: z.coerce.number().int().min(20).max(90),
  }).parse({
    id: value(form, "id"),
    headlineEn: value(form, "headlineEn"),
    headlineEs: value(form, "headlineEs"),
    ctaHref: value(form, "ctaHref"),
    backgroundTheme: value(form, "backgroundTheme"),
    overlayStrength: form.get("overlayStrength"),
  });

  await repo.storefront.update(parsed.id, {
    eyebrowEn: nullable(value(form, "eyebrowEn")),
    eyebrowEs: nullable(value(form, "eyebrowEs")),
    headlineEn: parsed.headlineEn,
    headlineEs: parsed.headlineEs,
    bodyEn: nullable(value(form, "bodyEn")),
    bodyEs: nullable(value(form, "bodyEs")),
    ctaLabelEn: nullable(value(form, "ctaLabelEn")),
    ctaLabelEs: nullable(value(form, "ctaLabelEs")),
    ctaHref: nullable(parsed.ctaHref),
    mediaId: nullable(value(form, "mediaId")),
    mobileMediaId: nullable(value(form, "mobileMediaId")),
    backgroundTheme: parsed.backgroundTheme,
    overlayStrength: parsed.overlayStrength,
    desktopPosition: value(form, "desktopPosition") || "50% 50%",
    mobilePosition: value(form, "mobilePosition") || "65% 50%",
    featuredProductId: nullable(value(form, "featuredProductId")),
    featuredCollection: nullable(value(form, "featuredCollection")),
    active: form.get("active") === "on",
  });
  revalidatePath("/");
  revalidatePath("/operator/storefront");
  redirect(`/operator/storefront?saved=${encodeURIComponent(parsed.id)}`);
}

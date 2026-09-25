"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { storage } from "@/lib/providers";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const list = (input: string) => input.split(",").map((item) => item.trim()).filter(Boolean);
/** One point per line, "Title :: Body". */
const points = (input: string) => input.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [t, ...rest] = line.split("::");
  return { t: (t ?? "").trim(), b: rest.join("::").trim() };
}).filter((point) => point.t && point.b);
const destination = z.string().min(1).refine((input) => input.startsWith("/") || /^https:\/\//.test(input), "Destination must be a site path or HTTPS URL");

export async function savePurposeOption(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    id: z.string().min(1),
    titleEn: z.string().min(1), titleEs: z.string().min(1),
    taglineEn: z.string().min(1), taglineEs: z.string().min(1),
    headlineEn: z.string().min(1), headlineEs: z.string().min(1),
    descriptionEn: z.string().min(1), descriptionEs: z.string().min(1),
    color: z.enum(["coral", "violet", "blue", "aqua", "green", "yellow", "pink", "gold"]),
    secondaryHref: destination,
    sortOrder: z.coerce.number().int().min(0),
  }).parse({
    id: value(form, "id"),
    titleEn: value(form, "titleEn"), titleEs: value(form, "titleEs"),
    taglineEn: value(form, "taglineEn"), taglineEs: value(form, "taglineEs"),
    headlineEn: value(form, "headlineEn"), headlineEs: value(form, "headlineEs"),
    descriptionEn: value(form, "descriptionEn"), descriptionEs: value(form, "descriptionEs"),
    color: value(form, "color"),
    secondaryHref: value(form, "secondaryHref"),
    sortOrder: form.get("sortOrder"),
  });

  const optionalDestination = (key: string) => { const href = value(form, key); return href ? destination.parse(href) : null; };
  const exampleHref = optionalDestination("exampleHref");
  const startHref = optionalDestination("startHref");

  // Card image: a dropped-in upload wins, then the library pick; "" clears it.
  let imageMediaId: string | null = value(form, "imageMediaId") || null;
  const file = form.get("imageFile");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) throw new Error("Card image must be an image file");
    if (file.size > 7 * 1024 * 1024) throw new Error("Image is too large (max 7 MB)");
    const uploaded = await storage.upload({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    const item = await repo.media.create({
      url: uploaded.url, alt: value(form, "imageAlt") || parsed.titleEn, kind: "image", storageKey: uploaded.url, contentType: file.type,
      objectPosition: value(form, "imagePosition") || "50% 50%", active: true, width: null, height: null,
    });
    imageMediaId = item.id;
  }

  const privacyEn = points(value(form, "privacyPointsEn"));
  const privacyEs = points(value(form, "privacyPointsEs"));
  const characters = list(value(form, "characterTeaser"));

  await repo.purposes.update(parsed.id, {
    titleEn: parsed.titleEn, titleEs: parsed.titleEs,
    taglineEn: parsed.taglineEn, taglineEs: parsed.taglineEs,
    headlineEn: parsed.headlineEn, headlineEs: parsed.headlineEs,
    descriptionEn: parsed.descriptionEn, descriptionEs: parsed.descriptionEs,
    chipsEn: list(value(form, "chipsEn")),
    chipsEs: list(value(form, "chipsEs")),
    color: parsed.color,
    secondaryHref: parsed.secondaryHref,
    sortOrder: parsed.sortOrder,
    active: form.get("active") === "on",
    privacyPointsEn: privacyEn.length ? privacyEn : null,
    privacyPointsEs: privacyEs.length ? privacyEs : null,
    characterTeaser: characters.length ? characters : null,
    imageMediaId,
    exampleHref, exampleLabelEn: value(form, "exampleLabelEn") || null, exampleLabelEs: value(form, "exampleLabelEs") || null,
    startHref, startLabelEn: value(form, "startLabelEn") || null, startLabelEs: value(form, "startLabelEs") || null,
  });
  revalidatePath("/");
  revalidatePath("/operator/purposes");
  revalidatePath("/operator/media");
  redirect(`/operator/purposes?saved=${encodeURIComponent(parsed.id)}`);
}

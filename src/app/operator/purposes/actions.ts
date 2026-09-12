"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";

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
    color: z.enum(["coral", "violet", "blue", "aqua", "green", "yellow"]),
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
  });
  revalidatePath("/");
  revalidatePath("/operator/purposes");
  redirect(`/operator/purposes?saved=${encodeURIComponent(parsed.id)}`);
}

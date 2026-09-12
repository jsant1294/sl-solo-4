"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const list = (input: string) => input.split("\n").map((line) => line.trim()).filter(Boolean);
const cents = (input: string) => { const t = input.trim(); if (!t) return null; const dollars = Number(t); return Number.isFinite(dollars) ? Math.round(dollars * 100) : null; };
const keySchema = z.string().min(1).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscore only");

export async function savePricingPlan(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    id: z.string().min(1),
    key: keySchema,
    nameEn: z.string().min(1), nameEs: z.string().min(1),
    sortOrder: z.coerce.number().int().min(0),
  }).parse({
    id: value(form, "id"),
    key: value(form, "key"),
    nameEn: value(form, "nameEn"), nameEs: value(form, "nameEs"),
    sortOrder: form.get("sortOrder"),
  });

  await repo.plans.update(parsed.id, {
    key: parsed.key,
    nameEn: parsed.nameEn, nameEs: parsed.nameEs,
    taglineEn: value(form, "taglineEn") || null, taglineEs: value(form, "taglineEs") || null,
    priceMonthlyCents: cents(value(form, "priceMonthly")),
    priceYearlyCents: cents(value(form, "priceYearly")),
    featuresEn: list(value(form, "featuresEn")),
    featuresEs: list(value(form, "featuresEs")),
    stripePriceIdMonthly: value(form, "stripePriceIdMonthly") || null,
    stripePriceIdYearly: value(form, "stripePriceIdYearly") || null,
    highlighted: form.get("highlighted") === "on",
    active: form.get("active") === "on",
    sortOrder: parsed.sortOrder,
  });
  revalidatePath("/operator/plans");
  redirect(`/operator/plans?saved=${encodeURIComponent(parsed.id)}`);
}

export async function createPricingPlan(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    key: keySchema,
    nameEn: z.string().min(1), nameEs: z.string().min(1),
  }).parse({ key: value(form, "key"), nameEn: value(form, "nameEn"), nameEs: value(form, "nameEs") });

  const created = await repo.plans.create({
    key: parsed.key, nameEn: parsed.nameEn, nameEs: parsed.nameEs,
    active: false, sortOrder: 99,
  });
  revalidatePath("/operator/plans");
  redirect(`/operator/plans?saved=${encodeURIComponent(created.id)}`);
}

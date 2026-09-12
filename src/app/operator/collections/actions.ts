"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const list = (input: string) => input.split(",").map((item) => item.trim()).filter(Boolean);

export async function saveCollectionOption(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    id: z.string().min(1),
    titleEn: z.string().min(1), titleEs: z.string().min(1),
    noteEn: z.string().min(1), noteEs: z.string().min(1),
    pattern: z.enum(["pattern-signature", "pattern-color", "pattern-play", "pattern-kids"]),
    sortOrder: z.coerce.number().int().min(0),
  }).parse({
    id: value(form, "id"),
    titleEn: value(form, "titleEn"), titleEs: value(form, "titleEs"),
    noteEn: value(form, "noteEn"), noteEs: value(form, "noteEs"),
    pattern: value(form, "pattern"),
    sortOrder: form.get("sortOrder"),
  });

  await repo.collections.update(parsed.id, {
    titleEn: parsed.titleEn, titleEs: parsed.titleEs,
    noteEn: parsed.noteEn, noteEs: parsed.noteEs,
    pattern: parsed.pattern,
    colors: list(value(form, "colors")),
    sortOrder: parsed.sortOrder,
    active: form.get("active") === "on",
  });
  revalidatePath("/");
  revalidatePath("/operator/collections");
  redirect(`/operator/collections?saved=${encodeURIComponent(parsed.id)}`);
}

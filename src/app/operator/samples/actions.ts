"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { storage } from "@/lib/providers";
import { sampleKeys } from "@/lib/samples";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const MAX = { image: 7, video: 7 }; // MB — under the 8 MB server-action body limit

/** Uploads a dropped-in file to the media library; returns its id, or null when no file was sent. */
async function uploadIfPresent(form: FormData, field: string, kind: "image" | "video", alt: string) {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith(`${kind}/`)) throw new Error(`Expected a ${kind} file`);
  if (file.size > MAX[kind] * 1024 * 1024) throw new Error(`File is too large (max ${MAX[kind]} MB)`);
  const uploaded = await storage.upload({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  const item = await repo.media.create({ url: uploaded.url, alt, kind, storageKey: uploaded.url, contentType: file.type, objectPosition: value(form, "position") || "50% 30%", active: true, width: null, height: null });
  return item.id;
}

export async function saveDemoSample(form: FormData) {
  await requireOperator();
  const key = z.enum(sampleKeys).parse(value(form, "key"));
  const alt = value(form, "alt") || `Sample ${key} profile photo`;
  const portraitMediaId = (await uploadIfPresent(form, "portraitFile", "image", alt)) ?? (value(form, "portraitMediaId") || null);
  const reelMediaId = (await uploadIfPresent(form, "reelFile", "video", `Sample ${key} reel`)) ?? (value(form, "reelMediaId") || null);
  await repo.demoSamples.upsert(key, {
    portraitMediaId, reelMediaId,
    active: form.get("active") === "on",
    sortOrder: z.coerce.number().int().min(0).parse(form.get("sortOrder") ?? 0),
  });
  revalidatePath("/");
  revalidatePath("/examples/[key]", "page");
  revalidatePath("/operator/samples");
  revalidatePath("/operator/media");
  redirect(`/operator/samples?saved=${key}`);
}

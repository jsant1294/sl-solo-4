"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { storage } from "@/lib/providers";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export async function uploadStorefrontMedia(form: FormData) {
  await requireOperator();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file to upload");
  const kind = z.enum(["image", "video"]).parse(file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "unsupported");
  if (file.size > (kind === "video" ? 50 : 12) * 1024 * 1024) throw new Error("File is too large");
  const result = await storage.upload({ name: file.name, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
  const item = await repo.media.create({
    url: result.url,
    alt: value(form, "alt") || file.name,
    kind,
    storageKey: result.url,
    contentType: file.type,
    objectPosition: value(form, "objectPosition") || "50% 50%",
    active: true,
    width: null,
    height: null,
  });
  revalidatePath("/");
  revalidatePath("/operator/media");
  revalidatePath("/operator/storefront");
  redirect(`/operator/media?uploaded=${encodeURIComponent(item.id)}`);
}

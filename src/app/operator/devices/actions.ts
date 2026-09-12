"use server";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";
import { z } from "zod";
import { redirect } from "next/navigation";
import { isProvisionableDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";

const deviceTypes = ["phone_plate", "card", "stand", "sticker", "bracelet", "keychain"] as const;

export async function registerDevice(form: FormData) {
  await requireOperator();
  const parsed = z.object({
    deviceCode: z.string(), type: z.enum(deviceTypes), label: z.string().trim().max(80),
    hardwareProductId: z.string().trim().max(80), hardwareVariantId: z.string().trim().max(80), sku: z.string().trim().max(80),
  }).safeParse({ deviceCode: form.get("deviceCode"), type: form.get("type"), label: form.get("label") ?? "", hardwareProductId: form.get("hardwareProductId") ?? "", hardwareVariantId: form.get("hardwareVariantId") ?? "", sku: form.get("sku") ?? "" });
  let error: string | null = null;
  if (!parsed.success || !isProvisionableDeviceCode(parsed.data.deviceCode)) error = "Device code must be 12–64 characters using A–Z, 0–9, _ or -";
  else {
    const code = normalizeDeviceCode(parsed.data.deviceCode);
    if (await repo.devices.byToken(code)) error = "Device code already registered";
    else {
      try {
        await repo.devices.create({ deviceCode: code, type: parsed.data.type, label: parsed.data.label || undefined, hardwareProductId: parsed.data.hardwareProductId || undefined, hardwareVariantId: parsed.data.hardwareVariantId || undefined, sku: parsed.data.sku || undefined });
      } catch (caught) { error = (caught as Error).message.includes("unique") ? "Device code already registered" : (caught as Error).message; }
    }
  }
  if (error) redirect(`/operator/devices?error=${encodeURIComponent(error)}`);
  revalidatePath("/operator/devices");
  redirect("/operator/devices?registered=1");
}

export async function updateDevice(form: FormData) {
  await requireOperator();
  const id = String(form.get("id"));
  const status = z.enum(["unclaimed", "assigned", "paired", "disabled", "lost", "replaced"]).parse(form.get("status"));
  const result = await repo.devices.transitionStatus(id, status);
  if (!result.ok) redirect(`/operator/devices/${id}?error=${encodeURIComponent(result.error)}`);
  await repo.devices.update(id, { label: String(form.get("label") ?? "") || null });
  revalidatePath("/operator/devices"); revalidatePath(`/operator/devices/${id}`);
}

export async function createReplacement(form: FormData) {
  await requireOperator();
  const id = String(form.get("id"));
  redirect(`/operator/devices/${id}?error=${encodeURIComponent("Replacement workflow is not available in this launch")}`);
}

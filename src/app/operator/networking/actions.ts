"use server";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";

export async function saveNetworkingSettings(form: FormData) {
  await requireOperator();
  await repo.networkingSettings.update({
    networkingEnabled: form.get("networkingEnabled") === "on",
    cardScannerEnabled: form.get("cardScannerEnabled") === "on",
    manualConnectionsEnabled: form.get("manualConnectionsEnabled") === "on",
    followUpEnabled: form.get("followUpEnabled") === "on",
  });
  revalidatePath("/operator/networking");
}

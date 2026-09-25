"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const nullable = (v: string) => v || null;
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function saveResumeSettings(form: FormData) {
  await requireOperator();
  const documentTypes = text(form, "allowedDocumentTypes").split(",").map((t) => t.trim()).filter(Boolean);
  const invalid = documentTypes.filter((t) => !ALLOWED_MIME_TYPES.includes(t));
  if (invalid.length) throw new Error(`Unsupported document type(s): ${invalid.join(", ")}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`);
  if (!documentTypes.length) throw new Error("At least one allowed document type is required");
  await repo.resumeSettings.update({
    featureEnabled: form.get("featureEnabled") === "on",
    manualBuilderEnabled: form.get("manualBuilderEnabled") === "on",
    uploadEnabled: form.get("uploadEnabled") === "on",
    aiExtractionEnabled: form.get("aiExtractionEnabled") === "on",
    publicPageEnabled: form.get("publicPageEnabled") === "on",
    pdfDownloadEnabled: form.get("pdfDownloadEnabled") === "on",
    requiredEntitlement: nullable(text(form, "requiredEntitlement")),
    maxUploadSizeMb: z.coerce.number().int().min(1).max(50).parse(text(form, "maxUploadSizeMb") || "10"),
    allowedDocumentTypes: documentTypes,
    ctaLabelEn: text(form, "ctaLabelEn") || "View Resume",
    ctaLabelEs: text(form, "ctaLabelEs") || "Ver currículum",
    sectionTitleEn: text(form, "sectionTitleEn") || "Professional",
    sectionTitleEs: text(form, "sectionTitleEs") || "Profesional",
    upsellHeadingEn: text(form, "upsellHeadingEn"),
    upsellHeadingEs: text(form, "upsellHeadingEs"),
    upsellBodyEn: text(form, "upsellBodyEn"),
    upsellBodyEs: text(form, "upsellBodyEs"),
    upsellCtaEn: text(form, "upsellCtaEn") || "Learn more",
    upsellCtaEs: text(form, "upsellCtaEs") || "Más información",
    upsellProductSlug: nullable(text(form, "upsellProductSlug")),
  });
  revalidatePath("/operator/resume");
  redirect("/operator/resume?saved=1");
}

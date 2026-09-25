"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId, listMyProfiles } from "@/lib/auth";
import { hasEntitlement, meetsEntitlementRequirement } from "@/lib/entitlements";
import { repo } from "@/db/repo";
import { db } from "@/db";
import { storage, resumeExtraction, type StructuredResumeExtraction } from "@/lib/providers";
import type { ResumeProfile, ResumeSettings } from "@/db/schema";

class ResumeAccessError extends Error {}

/** Resume attaches to the account's primary (first) profile — matching how most Solo accounts
 * have exactly one profile; Studio already handles multi-profile separately at /app/profiles/[id]. */
async function primaryProfile() {
  const profiles = await listMyProfiles();
  return profiles[0];
}

async function requireResumeAccess() {
  const userId = await requireUserId();
  if (!db) throw new ResumeAccessError("Resume requires online mode");
  const settings = await repo.resumeSettings.get();
  if (!settings.featureEnabled) throw new ResumeAccessError("Resume is temporarily unavailable");
  const granted = settings.requiredEntitlement ? await hasEntitlement(userId, settings.requiredEntitlement) : false;
  if (!meetsEntitlementRequirement(settings.requiredEntitlement, granted)) {
    throw new ResumeAccessError("This feature isn't included on your account yet");
  }
  const profile = await primaryProfile();
  if (!profile) throw new ResumeAccessError("Create a Solo profile first");
  return { userId, settings, profile };
}

export type ResumePageAccess =
  | { ok: true; userId: string; profileId: string; username: string; settings: ResumeSettings; resume: ResumeProfile | null }
  | { ok: false; reason: "no_profile" | "not_entitled" | "disabled" };

export async function getResumePageAccess(): Promise<ResumePageAccess> {
  const userId = await requireUserId();
  if (!db) return { ok: false, reason: "not_entitled" };
  const settings = await repo.resumeSettings.get();
  if (!settings.featureEnabled) return { ok: false, reason: "disabled" };
  const granted = settings.requiredEntitlement ? await hasEntitlement(userId, settings.requiredEntitlement) : false;
  if (!meetsEntitlementRequirement(settings.requiredEntitlement, granted)) return { ok: false, reason: "not_entitled" };
  const profile = await primaryProfile();
  if (!profile) return { ok: false, reason: "no_profile" };
  const resume = (await repo.resume.getOwned(profile.id, userId)) ?? null;
  return { ok: true, userId, profileId: profile.id, username: profile.username, settings, resume };
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const basicsFields = z.object({
  headline: z.string().trim().max(160).optional(),
  professionalSummary: z.string().trim().max(4000).optional(),
});

export async function saveResumeBasics(raw: unknown): Promise<SaveResult> {
  try {
    const { userId, profile } = await requireResumeAccess();
    const parsed = basicsFields.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Check the form and try again" };
    const resume = await repo.resume.getOrCreateForProfile(profile.id, userId);
    const row = await repo.resume.update(resume.id, userId, {
      headline: parsed.data.headline?.trim() || null,
      professionalSummary: parsed.data.professionalSummary?.trim() || null,
    });
    if (!row) return { ok: false, error: "Could not save" };
    revalidatePath("/app/resume");
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof ResumeAccessError ? e.message : "Could not save" }; }
}

const visibilityFields = z.object({
  publicEnabled: z.boolean(), showSummary: z.boolean(), showExperience: z.boolean(), showEducation: z.boolean(),
  showSkills: z.boolean(), showCertifications: z.boolean(), showLanguages: z.boolean(), showProjects: z.boolean(),
  showEmail: z.boolean(), showPhone: z.boolean(), showLocation: z.boolean(), showWebsite: z.boolean(),
  showOriginalPdf: z.boolean(),
  ctaLabelEn: z.string().trim().max(40).optional(),
  ctaLabelEs: z.string().trim().max(40).optional(),
});

export async function saveResumeVisibility(raw: unknown): Promise<SaveResult> {
  try {
    const { userId, profile, settings } = await requireResumeAccess();
    const parsed = visibilityFields.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Check the form and try again" };
    const resume = await repo.resume.getOrCreateForProfile(profile.id, userId);
    const v = parsed.data;
    const row = await repo.resume.update(resume.id, userId, {
      publicEnabled: settings.publicPageEnabled ? v.publicEnabled : false,
      showSummary: v.showSummary, showExperience: v.showExperience, showEducation: v.showEducation,
      showSkills: v.showSkills, showCertifications: v.showCertifications, showLanguages: v.showLanguages, showProjects: v.showProjects,
      showEmail: v.showEmail, showPhone: v.showPhone, showLocation: v.showLocation, showWebsite: v.showWebsite,
      showOriginalPdf: settings.pdfDownloadEnabled ? v.showOriginalPdf : false,
      ctaLabelEn: v.ctaLabelEn?.trim() || null, ctaLabelEs: v.ctaLabelEs?.trim() || null,
    });
    if (!row) return { ok: false, error: "Could not save" };
    revalidatePath("/app/resume"); revalidatePath("/app/resume/preview"); revalidatePath(`/u/${profile.username}`); revalidatePath(`/u/${profile.username}/resume`);
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof ResumeAccessError ? e.message : "Could not save" }; }
}

/* — Section items (experience/education/skills/certifications/languages/projects) — one
 * generic pair of actions instead of six near-duplicate ones. Field validation is a plain
 * required-fields check per section (real resumes are too varied for a strict shared schema). */
export type SectionName = "experience" | "education" | "skills" | "certifications" | "languages" | "projects";
// company/employer is deliberately NOT required — Professional must work for freelancers,
// contractors, self-employed people, students, and anyone else without a single employer.
// Title/role is the primary identifying field for an experience entry.
const REQUIRED_FIELDS: Record<SectionName, string[]> = {
  experience: ["title"], education: ["institution"], skills: ["name"],
  certifications: ["name"], languages: ["language"], projects: ["name"],
};
const TEXT_FIELDS: Record<SectionName, string[]> = {
  experience: ["company", "title", "location", "startDate", "endDate", "description"],
  education: ["institution", "degree", "fieldOfStudy", "location", "startDate", "endDate", "description"],
  skills: ["name", "category"],
  certifications: ["name", "issuer", "issueDate", "expirationDate", "credentialId", "credentialUrl"],
  languages: ["language", "proficiency"],
  projects: ["name", "role", "description", "url", "startDate", "endDate"],
};

function sanitizeSectionFields(section: SectionName, fields: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS[section]) {
    const v = fields[key];
    clean[key] = typeof v === "string" && v.trim() ? v.trim().slice(0, 2000) : null;
  }
  if (section === "experience") clean.current = fields.current === true;
  if (typeof fields.sortOrder === "number") clean.sortOrder = fields.sortOrder;
  if (typeof fields.visible === "boolean") clean.visible = fields.visible;
  return clean;
}

export async function saveSectionItem(section: SectionName, id: string | null, resumeProfileId: string, raw: Record<string, unknown>): Promise<SaveResult> {
  try {
    const { userId } = await requireResumeAccess();
    for (const required of REQUIRED_FIELDS[section]) {
      const v = raw[required];
      if (typeof v !== "string" || !v.trim()) return { ok: false, error: `${required} is required` };
    }
    const clean = sanitizeSectionFields(section, raw);
    const repoSection = repo.resume[section];
    const row = id
      ? await repoSection.update(id, resumeProfileId, userId, clean as never)
      : await repoSection.create(resumeProfileId, userId, clean as never);
    if (!row) return { ok: false, error: "Could not save — check you own this resume" };
    revalidatePath("/app/resume"); revalidatePath("/app/resume/edit");
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof ResumeAccessError ? e.message : "Could not save" }; }
}

export async function deleteSectionItem(section: SectionName, id: string, resumeProfileId: string): Promise<{ ok: boolean }> {
  try {
    const { userId } = await requireResumeAccess();
    const ok = await repo.resume[section].delete(id, resumeProfileId, userId);
    revalidatePath("/app/resume"); revalidatePath("/app/resume/edit");
    return { ok };
  } catch { return { ok: false }; }
}

/* — Upload + optional extraction — reuses the existing StorageProvider/media table, never
 * a separate upload system. Extraction is always a candidate for review; nothing is written
 * to the structured sections here — see applyExtraction(). */
export type UploadResult =
  | { ok: true; extraction: StructuredResumeExtraction | null; rawText: string | null }
  | { ok: false; code: "unavailable" | "invalid_file" | "extraction_failed"; error: string };

export async function uploadResume(form: FormData, extract: boolean): Promise<UploadResult> {
  try {
    const { userId, profile, settings } = await requireResumeAccess();
    if (!settings.uploadEnabled) return { ok: false, code: "unavailable", error: "Resume upload is turned off" };
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, code: "invalid_file", error: "Choose a PDF to upload" };
    if (!settings.allowedDocumentTypes.includes(file.type)) return { ok: false, code: "invalid_file", error: "Only PDF files are supported right now" };
    if (file.size > settings.maxUploadSizeMb * 1024 * 1024) return { ok: false, code: "invalid_file", error: `File is too large (max ${settings.maxUploadSizeMb}MB)` };

    const bytes = new Uint8Array(await file.arrayBuffer());
    let uploaded: { url: string };
    try {
      uploaded = await storage.upload({ name: `resume-${profile.id}-${file.name}`, data: bytes, contentType: file.type });
    } catch (e) {
      // Storage failure: no DB writes at all — no orphan media record, no partial resume state.
      return { ok: false, code: "unavailable", error: e instanceof Error ? e.message : "Storage is not configured" };
    }
    const mediaRow = await repo.products.createMedia({ url: uploaded.url, kind: "document", contentType: file.type, alt: null, objectPosition: "50% 50%", active: true, storageKey: null, width: null, height: null });

    const resume = await repo.resume.getOrCreateForProfile(profile.id, userId);
    const oldMediaId = resume.originalResumeMediaId;
    const oldMediaUrl = oldMediaId ? (await repo.media.byId(oldMediaId))?.url : null;
    async function cleanUpOldFile() {
      if (!oldMediaId) return;
      if (oldMediaUrl?.includes("blob.vercel-storage.com")) { try { await storage.delete(oldMediaUrl); } catch { /* best-effort cleanup */ } }
      await repo.products.deleteMedia(oldMediaId); // leave no orphan media record
    }

    if (!extract) {
      await repo.resume.update(resume.id, userId, { originalResumeMediaId: mediaRow.id, originalFileName: file.name });
      await cleanUpOldFile();
      revalidatePath("/app/resume");
      return { ok: true, extraction: null, rawText: null };
    }

    if (!settings.aiExtractionEnabled) {
      await repo.resume.update(resume.id, userId, { originalResumeMediaId: mediaRow.id, originalFileName: file.name });
      return { ok: false, code: "unavailable", error: "AI extraction is turned off — the file is saved, build the details manually" };
    }

    try {
      const { extraction, rawText, provider, model } = await resumeExtraction.extractResume({ data: bytes, contentType: file.type });
      await repo.resume.update(resume.id, userId, {
        originalResumeMediaId: mediaRow.id, originalFileName: file.name,
        extractionProvider: provider, extractionModel: model,
        extractionStatus: "completed", extractionError: null,
      });
      await cleanUpOldFile();
      revalidatePath("/app/resume");
      return { ok: true, extraction, rawText };
    } catch (e) {
      // Every error thrown inside src/lib/providers' resumeExtraction is already a curated,
      // safe-to-show message (unavailable credential, provider HTTP status, unparseable
      // response, or an unsupported-input rejection like "Groq does not support PDF...") —
      // never a raw stack trace. Show it as-is instead of collapsing everything to one
      // generic string, which was silently discarding specific, actionable detail.
      const message = e instanceof Error ? e.message : "Could not read that resume — try again or build it manually";
      await repo.resume.update(resume.id, userId, { originalResumeMediaId: mediaRow.id, originalFileName: file.name, extractionStatus: "failed", extractionError: message.slice(0, 500) });
      revalidatePath("/app/resume");
      return { ok: false, code: "extraction_failed", error: message };
    }
  } catch (e) {
    return { ok: false, code: e instanceof ResumeAccessError ? "unavailable" : "extraction_failed", error: e instanceof Error ? e.message : "Could not upload" };
  }
}

/** Owner-confirmed extraction review — replaces the resume's basics + every section's rows.
 * Only ever called from the explicit review screen, never automatically after extraction. */
export async function applyExtraction(extraction: StructuredResumeExtraction): Promise<SaveResult> {
  try {
    const { userId, profile } = await requireResumeAccess();
    const resume = await repo.resume.getOrCreateForProfile(profile.id, userId);
    await repo.resume.update(resume.id, userId, {
      headline: extraction.headline?.trim() || null,
      professionalSummary: extraction.summary?.trim() || null,
      dataSource: "extracted",
    });
    const sections: SectionName[] = ["experience", "education", "skills", "certifications", "languages", "projects"];
    for (const section of sections) {
      const existing = await repo.resume[section].list(resume.id);
      for (const item of existing) await repo.resume[section].delete(item.id, resume.id, userId);
    }
    for (const [i, exp] of extraction.experience.entries()) await repo.resume.experience.create(resume.id, userId, { company: exp.company ?? "Company", title: exp.title ?? "Role", location: exp.location ?? null, startDate: exp.startDate ?? null, endDate: exp.endDate ?? null, current: exp.current ?? false, description: exp.description ?? null, sortOrder: i } as never);
    for (const [i, ed] of extraction.education.entries()) await repo.resume.education.create(resume.id, userId, { institution: ed.institution ?? "Institution", degree: ed.degree ?? null, fieldOfStudy: ed.fieldOfStudy ?? null, location: ed.location ?? null, startDate: ed.startDate ?? null, endDate: ed.endDate ?? null, description: ed.description ?? null, sortOrder: i } as never);
    for (const [i, sk] of extraction.skills.entries()) await repo.resume.skills.create(resume.id, userId, { name: sk.name ?? "Skill", category: sk.category ?? null, sortOrder: i } as never);
    for (const [i, c] of extraction.certifications.entries()) await repo.resume.certifications.create(resume.id, userId, { name: c.name ?? "Certification", issuer: c.issuer ?? null, issueDate: c.issueDate ?? null, expirationDate: c.expirationDate ?? null, credentialId: c.credentialId ?? null, credentialUrl: c.credentialUrl ?? null, sortOrder: i } as never);
    for (const [i, l] of extraction.languages.entries()) await repo.resume.languages.create(resume.id, userId, { language: l.language ?? "Language", proficiency: l.proficiency ?? null, sortOrder: i } as never);
    for (const [i, p] of extraction.projects.entries()) await repo.resume.projects.create(resume.id, userId, { name: p.name ?? "Project", role: p.role ?? null, description: p.description ?? null, url: p.url ?? null, startDate: p.startDate ?? null, endDate: p.endDate ?? null, sortOrder: i } as never);

    revalidatePath("/app/resume");
    return { ok: true, id: resume.id };
  } catch (e) { return { ok: false, error: e instanceof ResumeAccessError ? e.message : "Could not save" }; }
}

export async function deleteOriginalFile(): Promise<{ ok: boolean }> {
  try {
    const { userId, profile } = await requireResumeAccess();
    const resume = await repo.resume.getOwned(profile.id, userId);
    if (!resume?.originalResumeMediaId) return { ok: true };
    const mediaId = resume.originalResumeMediaId;
    const mediaRow = await repo.media.byId(mediaId);
    // Removing the file also clears any stale extraction status/error tied to it — there's
    // no file left for that status to describe.
    await repo.resume.update(resume.id, userId, {
      originalResumeMediaId: null, originalFileName: null, showOriginalPdf: false,
      extractionStatus: null, extractionError: null,
    });
    if (mediaRow?.url.includes("blob.vercel-storage.com")) { try { await storage.delete(mediaRow.url); } catch { /* best-effort */ } }
    await repo.products.deleteMedia(mediaId); // leave no orphan media record
    revalidatePath("/app/resume");
    return { ok: true };
  } catch { return { ok: false }; }
}

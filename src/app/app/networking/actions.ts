"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { hasEntitlement, ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";
import { repo } from "@/db/repo";
import { db } from "@/db";
import { ocr, OCRProviderUnavailableError, type BusinessCardCandidate } from "@/lib/providers";
import type { NetworkingLead } from "@/db/schema";

/**
 * Every action here starts with requireNetworkingAccess() — the single choke point that
 * checks the durable solo_networking entitlement (never catalog/price config) and the CMS
 * on/off switches. Ownership is additionally enforced inside repo.networkingLeads.* itself
 * (WHERE userId = ...), so even a bug here can't leak another owner's leads.
 */
class NetworkingAccessError extends Error {}

async function requireNetworkingAccess() {
  const userId = await requireUserId();
  if (!db) throw new NetworkingAccessError("Networking requires online mode");
  if (!(await hasEntitlement(userId, ENTITLEMENT_SOLO_NETWORKING))) {
    throw new NetworkingAccessError("Networking is part of the SnapLink Networking Kit");
  }
  const settings = await repo.networkingSettings.get();
  if (!settings.networkingEnabled) throw new NetworkingAccessError("Networking is temporarily unavailable");
  return { userId, settings };
}

const leadFields = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  displayName: z.string().trim().min(1, "Enter at least a name").max(160),
  company: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(160).optional(),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(300).optional(),
  addressLine: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(40).optional(),
  country: z.string().trim().max(120).optional(),
  linkedinUrl: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(4000).optional(),
  followUpAt: z.string().trim().optional(), // yyyy-mm-dd from <input type=date>
});

function toNullable(v: string | undefined) { return v && v.length ? v : null; }

function cleanInput(input: z.infer<typeof leadFields>) {
  return {
    firstName: toNullable(input.firstName), lastName: toNullable(input.lastName),
    displayName: input.displayName.trim(),
    company: toNullable(input.company), jobTitle: toNullable(input.jobTitle),
    email: toNullable(input.email), phone: toNullable(input.phone), website: toNullable(input.website),
    addressLine: toNullable(input.addressLine), city: toNullable(input.city), region: toNullable(input.region),
    postalCode: toNullable(input.postalCode), country: toNullable(input.country),
    linkedinUrl: toNullable(input.linkedinUrl), notes: toNullable(input.notes),
    followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
  };
}

/** Used by pages (not a mutation) to decide whether to render the feature or an upsell/disabled state. */
export type NetworkingPageAccess =
  | { ok: true; userId: string; settings: Awaited<ReturnType<typeof repo.networkingSettings.get>> }
  | { ok: false; reason: "not_entitled" | "disabled" };

export async function getNetworkingPageAccess(): Promise<NetworkingPageAccess> {
  const userId = await requireUserId();
  if (!db) return { ok: false, reason: "not_entitled" };
  if (!(await hasEntitlement(userId, ENTITLEMENT_SOLO_NETWORKING))) return { ok: false, reason: "not_entitled" };
  const settings = await repo.networkingSettings.get();
  if (!settings.networkingEnabled) return { ok: false, reason: "disabled" };
  return { ok: true, userId, settings };
}

export type ScanResult =
  | { ok: true; candidate: BusinessCardCandidate; rawText: string }
  | { ok: false; code: "unavailable" | "invalid_file" | "extraction_failed" | "not_entitled"; error: string };

/** sessionKey carries userId here (not a browser session) — the closest fit on the existing
 * commerceEvents shape without adding a second analytics system. Never logs card contents. */
async function track(type: "networking_opened" | "card_scan_started" | "card_scan_completed" | "card_scan_failed" | "networking_lead_saved" | "networking_lead_updated", userId: string) {
  if (!db) return;
  try { await repo.commerce.record({ type, sessionKey: userId }); } catch { /* analytics must never break the feature */ }
}

/** Scans an uploaded card image in memory only — never written to disk/blob/DB. */
export async function scanBusinessCard(form: FormData): Promise<ScanResult> {
  let uid: string | undefined;
  try {
    const { userId, settings } = await requireNetworkingAccess();
    uid = userId;
    if (!settings.cardScannerEnabled) return { ok: false, code: "unavailable", error: "Business card scanning is turned off" };
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return { ok: false, code: "invalid_file", error: "Choose a photo of the card" };
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return { ok: false, code: "invalid_file", error: "Use a JPEG, PNG, or WEBP photo" };
    }
    if (file.size > 10 * 1024 * 1024) return { ok: false, code: "invalid_file", error: "Photo is too large (max 10MB)" };
    await track("card_scan_started", userId);
    const { candidate, rawText } = await ocr.extractBusinessCard({ data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    await track("card_scan_completed", userId);
    return { ok: true, candidate, rawText };
  } catch (e) {
    if (uid) await track("card_scan_failed", uid);
    if (e instanceof OCRProviderUnavailableError) return { ok: false, code: "unavailable", error: e.message };
    if (e instanceof NetworkingAccessError) return { ok: false, code: "not_entitled", error: e.message };
    return { ok: false, code: "extraction_failed", error: "Could not read that card — try again or enter it manually" };
  }
}

export type DuplicateCheck = { duplicate: NetworkingLead | null };

export async function checkDuplicateConnection(input: { email?: string; phone?: string }): Promise<DuplicateCheck> {
  try {
    const { userId } = await requireNetworkingAccess();
    const email = input.email?.trim() || undefined;
    const phone = input.phone?.trim() || undefined;
    if (!email && !phone) return { duplicate: null };
    const duplicate = await repo.networkingLeads.findDuplicate(userId, { email, phone });
    return { duplicate: duplicate ?? null };
  } catch { return { duplicate: null }; }
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

async function saveLead(
  source: "business_card_scan" | "manual",
  raw: unknown,
  extra?: { rawExtraction?: string | null },
): Promise<SaveResult> {
  try {
    const { userId } = await requireNetworkingAccess();
    const parsed = leadFields.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
    const clean = cleanInput(parsed.data);
    const row = await repo.networkingLeads.create(userId, { ...clean, source, rawExtraction: extra?.rawExtraction ?? null });
    await track("networking_lead_saved", userId);
    revalidatePath("/app/networking");
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not save this connection" }; }
}

export async function createManualConnection(raw: unknown): Promise<SaveResult> {
  try {
    const { settings } = await requireNetworkingAccess();
    if (!settings.manualConnectionsEnabled) return { ok: false, error: "Adding connections manually is turned off" };
    return await saveLead("manual", raw);
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not save this connection" }; }
}

export async function saveScannedConnection(raw: unknown, rawExtraction: string | null): Promise<SaveResult> {
  try {
    const { settings } = await requireNetworkingAccess();
    if (!settings.cardScannerEnabled) return { ok: false, error: "Business card scanning is turned off" };
    return await saveLead("business_card_scan", raw, { rawExtraction });
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not save this connection" }; }
}

export async function updateConnection(id: string, raw: unknown): Promise<SaveResult> {
  try {
    const { userId } = await requireNetworkingAccess();
    const parsed = leadFields.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form and try again" };
    const clean = cleanInput(parsed.data);
    const row = await repo.networkingLeads.update(id, userId, clean);
    if (!row) return { ok: false, error: "Connection not found" };
    await track("networking_lead_updated", userId);
    revalidatePath("/app/networking");
    revalidatePath(`/app/networking/${id}`);
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not save changes" }; }
}

export async function setFollowUp(id: string, dateStr: string | null): Promise<SaveResult> {
  try {
    const { userId, settings } = await requireNetworkingAccess();
    if (!settings.followUpEnabled) return { ok: false, error: "Follow-up reminders are turned off" };
    const row = await repo.networkingLeads.update(id, userId, { followUpAt: dateStr ? new Date(dateStr) : null });
    if (!row) return { ok: false, error: "Connection not found" };
    await track("networking_lead_updated", userId);
    revalidatePath("/app/networking");
    revalidatePath(`/app/networking/${id}`);
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not update follow-up" }; }
}

export async function setNotes(id: string, notes: string): Promise<SaveResult> {
  try {
    const { userId } = await requireNetworkingAccess();
    const row = await repo.networkingLeads.update(id, userId, { notes: notes.trim() ? notes.trim().slice(0, 4000) : null });
    if (!row) return { ok: false, error: "Connection not found" };
    revalidatePath(`/app/networking/${id}`);
    return { ok: true, id: row.id };
  } catch (e) { return { ok: false, error: e instanceof NetworkingAccessError ? e.message : "Could not save notes" }; }
}

export async function deleteConnection(id: string): Promise<{ ok: boolean }> {
  try {
    const { userId } = await requireNetworkingAccess();
    const ok = await repo.networkingLeads.delete(id, userId);
    revalidatePath("/app/networking");
    return { ok };
  } catch { return { ok: false }; }
}

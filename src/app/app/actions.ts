"use server";
import { requireOwnedProfile, requireUserId } from "@/lib/auth";
import { checkUsername } from "@/lib/username";
import { validateProfileData, type ProfileType } from "@/lib/profile-data";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { DEMO_PROFILES } from "@/db/demo";
import { nanoid } from "nanoid";
import { profiles as profilesTable } from "@/db/schema";
import { storage } from "@/lib/providers";
import { eq, and } from "drizzle-orm";
import { contactChannelInputSchema } from "@/lib/contact-channels";
import { withProfileExperience } from "@/lib/profile-data";
import { z } from "zod";
import { normalizePaymentMethod, paymentMethodSchema } from "@/lib/payment-methods";

/**
 * Studio mutations — ownership verified server-side via requireOwnedProfile.
 * Persists to DB (Drizzle) when wired, else the in-memory demo array.
 */

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function updateProfileFields(
  profileId: string,
  fields: Partial<{ displayName: string; headline: string; bio: string; phone: string;
    email: string; website: string; location: string; theme: string; accent: string }>,
): Promise<SaveResult> {
  try {
    const p = await requireOwnedProfile(profileId);
    if (db) await repo.profiles.update(profileId, fields as Record<string, unknown>);
    else Object.assign(p as Record<string, unknown>, fields);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function updateContactChannels(profileId: string, input: unknown, primaryAction: string): Promise<SaveResult> {
  try {
    const profile = await requireOwnedProfile(profileId);
    const rows = z.array(contactChannelInputSchema).max(11).parse(input);
    const allowedPrimary = primaryAction === "share" || rows.some((row) => row.type === primaryAction && row.enabled && row.public);
    if (!allowedPrimary) return { ok: false, error: "Primary action must be public and enabled" };
    if ((profile as { type: string }).type === "kids" && rows.some((row) => !["call", "sms", "whatsapp", "vcard"].includes(row.type))) {
      return { ok: false, error: "Protect profiles only support guardian-safe contact actions" };
    }
    if (!db) return { ok: false, error: "Database required" };
    if (!profile) return { ok: false, error: "Profile not found" };
    const data = withProfileExperience(profile.data, { contactChannels: rows.map((row) => ({ ...row, value: row.value || null })), primaryContactAction: primaryAction });
    await repo.profiles.update(profileId, { data: data as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function updateShareSettings(profileId: string, input: { title: string; description: string }): Promise<SaveResult> {
  try {
    const profile = await requireOwnedProfile(profileId);
    const parsed = z.object({ title: z.string().max(90), description: z.string().max(220) }).parse(input);
    if (!profile) return { ok: false, error: "Profile not found" };
    if (db) await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { shareTitle: parsed.title || null, shareDescription: parsed.description || null }) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function updateFavoriteLinks(profileId: string, linkIds: string[]): Promise<SaveResult> {
  try {
    const profile = await requireOwnedProfile(profileId);
    if (!profile) return { ok: false, error: "Profile not found" };
    const requested = z.array(z.string()).max(2).parse(linkIds);
    const owned = new Set(profile.links.map((link) => link.id));
    if (requested.some((linkId) => !owned.has(linkId))) return { ok: false, error: "Invalid favorite link" };
    if (db) await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { favoriteLinkIds: requested }) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function updatePaymentMethods(profileId: string, input: unknown): Promise<SaveResult> {
  try {
    const profile = await requireOwnedProfile(profileId);
    if (!profile) return { ok: false, error: "Profile not found" };
    if (profile.type === "kids") return { ok: false, error: "Payments are unavailable on Protect profiles" };
    const methods = z.array(paymentMethodSchema).max(5).parse(input);
    if (methods.some((method) => method.enabled && method.public && !normalizePaymentMethod(method))) return { ok: false, error: "Invalid public payment destination" };
    if (db) await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { paymentMethods: methods }) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function uploadShareImage(profileId: string, form: FormData) {
  try {
    const profile = await requireOwnedProfile(profileId);
    if (!profile) return { ok: false as const, error: "Profile not found" };
    const file = form.get("shareImage");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size === 0 || file.size > 8 * 1024 * 1024) return { ok: false as const, error: "Choose an image under 8 MB" };
    const uploaded = await storage.upload({ name: `share-${profileId}-${file.name}`, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    if (db) {
      await repo.media.create({ url: uploaded.url, alt: "Profile share image", kind: "image", storageKey: null, contentType: file.type, width: null, height: null, objectPosition: "50% 50%", active: true });
      await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { shareImageUrl: uploaded.url }) as never });
    }
    return { ok: true as const, url: uploaded.url };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function removeShareImage(profileId: string) {
  try {
    const profile = await requireOwnedProfile(profileId);
    if (!profile) return { ok: false as const, error: "Profile not found" };
    const current = (profile.data as { experience?: { shareImageUrl?: string } }).experience?.shareImageUrl;
    if (db) await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { shareImageUrl: null }) as never });
    if (current?.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) await storage.delete(current);
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function updateProfileData(profileId: string, dataInput: unknown): Promise<SaveResult> {
  try {
    const p = await requireOwnedProfile(profileId);
    const validated = validateProfileData((p as { type: string }).type as ProfileType, dataInput);
    // Talent snapshots are writable only through the revision-checked Talent Studio action.
    delete (validated as Record<string, unknown>).talent;
    if (p && p.data && "talent" in p.data) (validated as Record<string, unknown>).talent = p.data.talent;
    if (db) await repo.profiles.update(profileId, { data: validated } as Record<string, unknown>);
    else (p as { data: unknown }).data = validated;
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setProfileStatus(profileId: string, status: "draft" | "active" | "disabled"): Promise<SaveResult> {
  try {
    const p = await requireOwnedProfile(profileId);
    if (db) await repo.profiles.update(profileId, { status } as Record<string, unknown>);
    else (p as { status: string }).status = status;
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function claimUsername(profileId: string, raw: string): Promise<SaveResult> {
  try {
    const p = await requireOwnedProfile(profileId);
    if ((p as { type: string }).type === "kids") return { ok: false, error: "Kids profiles use a private handle" };
    const check = checkUsername(raw);
    if (!check.ok) return { ok: false, error: check.reason };
    if (db) {
      const existing = await repo.profiles.byUsername(check.value);
      if (existing && existing.id !== profileId) return { ok: false, error: "taken" };
      await repo.profiles.update(profileId, { username: check.value } as Record<string, unknown>);
    } else {
      const taken = DEMO_PROFILES.some((x) => x.username === check.value && x.id !== profileId);
      if (taken) return { ok: false, error: "taken" };
      (p as { username: string }).username = check.value;
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function createProfile(type: ProfileType, displayName: string, requestedUsername: string, accent?: string): Promise<
  { ok: true; profileId: string } | { ok: false; error: string }
> {
  try {
    const uid = await requireUserId();
    const checked = checkUsername(requestedUsername);
    if (!checked.ok) return { ok: false, error: checked.reason };
    const existing = db
      ? await repo.profiles.byUsername(checked.value)
      : DEMO_PROFILES.find((profile) => profile.username === checked.value);
    if (existing) return { ok: false, error: "taken" };
    const rand = nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || nanoid(8);
    const kidsData = { firstName: displayName || "Child", usePhoto: false, guardians: [],
      helpMessage: "If I need help, please contact my parent or guardian." };
    const kidsAccent = accent ?? "#E86FA6";

    if (db) {
      const [row] = await db.insert(profilesTable).values({
        userId: uid, type, status: "draft",
        username: checked.value,
        displayName: displayName || "Untitled",
        accent: type === "kids" ? kidsAccent : null,
        data: (type === "kids" ? kidsData : {}) as never,
      }).returning();
      // permanent destination for the new profile
      await repo.destinations.create(row.id, `dst_${nanoid(10)}`);
      return { ok: true, profileId: row.id };
    }

    const id = `p_${rand}`;
    DEMO_PROFILES.push({
      id, userId: uid, type, status: "draft",
      username: checked.value,
      displayName: displayName || "Untitled",
      headline: null, bio: null, avatarUrl: null, phone: null, email: null,
      website: null, location: null, accent: type === "kids" ? kidsAccent : null,
      theme: "ivory", locale: "en",
      data: (type === "kids" ? kidsData : {}) as never,
      active: true, createdAt: new Date(), destinationToken: `dst_${rand}`, links: [],
      contactChannels: [],
    });
    return { ok: true, profileId: id };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function createLink(profileId: string, input: { type: string; label: string; url: string }) {
  try { const p = await requireOwnedProfile(profileId); if (!p || !db) return { ok: false as const, error: "Database required" }; const url = new URL(input.url).toString(); const row = await repo.links.create(profileId, { type: input.type as never, label: input.label, url, sortOrder: p.links.length }); return { ok: true as const, link: row }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function updateLink(profileId: string, linkId: string, input: { type: string; label: string; url: string; visible: boolean }) {
  try { await requireOwnedProfile(profileId); if (!db) return { ok: false as const, error: "Database required" }; const row = await repo.links.update(linkId, profileId, { type: input.type as never, label: input.label || null, url: new URL(input.url).toString(), visible: input.visible }); return { ok: true as const, link: row }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function deleteLink(profileId: string, linkId: string) {
  try { await requireOwnedProfile(profileId); if (!db) return { ok: false as const, error: "Database required" }; await repo.links.delete(linkId, profileId); return { ok: true as const }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function reorderLinks(profileId: string, ids: string[]) {
  try { await requireOwnedProfile(profileId); if (!db) return { ok: false as const, error: "Database required" }; await Promise.all(ids.map((id, sortOrder) => repo.links.update(id, profileId, { sortOrder }))); return { ok: true as const }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function uploadAvatar(profileId: string, form: FormData) {
  try { const profile = await requireOwnedProfile(profileId); if (!profile) return { ok: false as const, error: "Profile not found" }; const file = form.get("avatar"); if (!(file instanceof File) || !file.type.startsWith("image/") || file.size === 0 || file.size > 8 * 1024 * 1024) return { ok: false as const, error: "Choose an image under 8 MB" }; const uploaded = await storage.upload({ name: `avatar-${profileId}-${file.name}`, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type }); if (db) await repo.profiles.update(profileId, { avatarUrl: uploaded.url }); return { ok: true as const, url: uploaded.url }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}
export async function removeAvatar(profileId: string) {
  try { const profile = await requireOwnedProfile(profileId); if (!profile) return { ok: false as const, error: "Profile not found" }; if (db) await repo.profiles.update(profileId, { avatarUrl: null }); if (profile.avatarUrl?.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) await storage.delete(profile.avatarUrl); return { ok: true as const }; } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { checkUsername, type UsernameCheck } from "@/lib/username";
import type { ProfileType } from "@/lib/profile-data";
import type { Locale } from "@/i18n/dict";

const ALLOWED_TYPES = ["personal", "business"] as const satisfies readonly ProfileType[];
const ALLOWED_LOCALES = ["en", "es"] as const satisfies readonly Locale[];

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

const usernameMessage: Record<Extract<UsernameCheck, { ok: false }>["reason"], string> = {
  too_short: "Username must be at least 3 characters.",
  too_long: "Username must be 30 characters or fewer.",
  invalid: "Username can only use lowercase letters, numbers, hyphens, and underscores.",
  reserved: "That username is reserved.",
};

function fail(message: string): never {
  redirect(`/operator/profiles/new?error=${encodeURIComponent(message)}`);
}

const fields = z.object({
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid owner email."),
  ownerName: z.string().trim().min(1, "Owner name is required."),
  displayName: z.string().trim().min(1, "Display name is required."),
});

export async function createOperatorProfile(form: FormData): Promise<void> {
  await requireOperator();

  const parsed = fields.safeParse({
    ownerEmail: value(form, "ownerEmail"),
    ownerName: value(form, "ownerName"),
    displayName: value(form, "displayName"),
  });
  if (!parsed.success) fail(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  const { ownerEmail, ownerName, displayName } = parsed.data;

  const checkedUsername = checkUsername(value(form, "username"));
  if (!checkedUsername.ok) fail(usernameMessage[checkedUsername.reason]);
  const username = checkedUsername.value;

  const rawType = value(form, "type");
  const type = (ALLOWED_TYPES as readonly string[]).includes(rawType) ? (rawType as ProfileType) : "personal";

  const rawLocale = value(form, "locale");
  const locale = (ALLOWED_LOCALES as readonly string[]).includes(rawLocale) ? (rawLocale as Locale) : "en";

  const accent = value(form, "accent");

  const existing = await repo.profiles.byUsername(username);
  if (existing) fail("This username is already in use.");

  let result: Awaited<ReturnType<typeof repo.profiles.createForOwner>>;
  try {
    result = await repo.profiles.createForOwner({
      ownerEmail, ownerName, type, username, displayName, locale,
      data: {}, accent: accent || null,
    });
  } catch {
    fail("Could not create the profile. Please try again.");
  }

  redirect(`/operator/profiles/${result.profile.id}`);
}

/* ————————————————————————————————————————————————
 * OPERATOR PROFILE CONTROL PLANE — server actions.
 * Admin-scoped mutations. Authorization = requireOperator() (role, DB-
 * authoritative). These share the SAME domain model, zod schemas and repo
 * as the customer Studio (`src/app/app/actions.ts`) but authorize against
 * the operator role instead of profile ownership — a server-side override,
 * not a client-side flag. No operator-specific duplicate fields.
 * ———————————————————————————————————————————————— */

import { db } from "@/db";
import { storage } from "@/lib/providers";
import { linkTypeEnum, type Profile, type ProfileLink } from "@/db/schema";
import {
  validateProfileData, withProfileExperience, withProfilePresentation,
  PROFILE_LAYOUTS, floatingCtaSchema, withFloatingCta, withProfileLayout,
  type ProfileSectionId, type ProfileSectionConfig, type ProfileLayoutKey,
} from "@/lib/profile-data";
import { PALETTES } from "@/lib/profile-palettes";
import { contactChannelInputSchema } from "@/lib/contact-channels";
import { normalizePaymentMethod, paymentMethodSchema } from "@/lib/payment-methods";

export type OpResult = { ok: true } | { ok: false; error: string };
const LINK_TYPES = linkTypeEnum.enumValues as readonly string[];

async function adminProfile(profileId: string) {
  await requireOperator();
  const p = await repo.profiles.adminById(profileId);
  if (!p) throw new Error("Profile not found");
  return p;
}

export async function opUpdateProfile(
  profileId: string,
  fields: Partial<{
    displayName: string; headline: string; bio: string; phone: string;
    email: string; website: string; location: string; theme: string; accent: string;
  }>,
): Promise<OpResult> {
  try {
    await adminProfile(profileId);
    const cleaned: Record<string, unknown> = {};
    const v = (key: keyof typeof fields) =>
      (fields as Record<string, unknown>)[key] === undefined ? undefined : String((fields as Record<string, unknown>)[key]).trim();
    if (v("displayName") !== undefined) {
      if (!v("displayName")) return { ok: false, error: "Display name is required." };
      cleaned.displayName = v("displayName");
    }
    if (v("theme") !== undefined) {
      if (!linkTypesForTheme.includes(String(v("theme")))) return { ok: false, error: "Unknown theme." };
      cleaned.theme = String(v("theme"));
    }
    for (const key of ["headline", "bio", "phone", "email", "website", "location", "accent"] as const) {
      if (v(key) !== undefined) cleaned[key] = v(key) || null;
    }
    await repo.profiles.update(profileId, cleaned as Partial<Profile>);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
const linkTypesForTheme = ["ivory", "obsidian", "signature_gold"];

export async function opSetStatus(profileId: string, status: string): Promise<OpResult> {
  try {
    await adminProfile(profileId);
    if (!["draft", "active", "disabled"].includes(status)) return { ok: false, error: "Invalid status." };
    await repo.profiles.update(profileId, { status: status as Profile["status"] });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opClaimUsername(profileId: string, raw: string): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    if (p.type === "kids") return { ok: false, error: "Kids profiles use a private handle." };
    const check = checkUsername(raw);
    if (!check.ok) return { ok: false, error: "Invalid username." };
    const existing = await repo.profiles.byUsername(check.value);
    if (existing && existing.id !== profileId) return { ok: false, error: "That username is already in use." };
    await repo.profiles.update(profileId, { username: check.value });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUploadAvatar(profileId: string, form: FormData) {
  try {
    await adminProfile(profileId);
    const file = form.get("avatar");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size === 0 || file.size > 8 * 1024 * 1024) {
      return { ok: false as const, error: "Choose an image under 8 MB." };
    }
    const uploaded = await storage.upload({ name: `avatar-${profileId}-${file.name}`, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    await repo.profiles.update(profileId, { avatarUrl: uploaded.url });
    return { ok: true as const, url: uploaded.url };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opRemoveAvatar(profileId: string) {
  try {
    const p = await adminProfile(profileId);
    await repo.profiles.update(profileId, { avatarUrl: null });
    if (p.avatarUrl?.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) await storage.delete(p.avatarUrl);
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opUploadShareImage(profileId: string, form: FormData) {
  try {
    const p = await adminProfile(profileId);
    const file = form.get("shareImage");
    if (!(file instanceof File) || !file.type.startsWith("image/") || file.size === 0 || file.size > 8 * 1024 * 1024) {
      return { ok: false as const, error: "Choose an image under 8 MB." };
    }
    const uploaded = await storage.upload({ name: `share-${profileId}-${file.name}`, data: new Uint8Array(await file.arrayBuffer()), contentType: file.type });
    await repo.profiles.update(profileId, { data: withProfileExperience(p.data, { shareImageUrl: uploaded.url }) as never });
    return { ok: true as const, url: uploaded.url };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opRemoveShareImage(profileId: string) {
  try {
    const p = await adminProfile(profileId);
    const current = (p.data as { experience?: { shareImageUrl?: string } }).experience?.shareImageUrl;
    await repo.profiles.update(profileId, { data: withProfileExperience(p.data, { shareImageUrl: null }) as never });
    if (current?.includes("blob.vercel-storage.com") && process.env.BLOB_READ_WRITE_TOKEN) await storage.delete(current);
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opUpdateCategory(profileId: string, category: string): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    const value = String(category ?? "").trim().slice(0, 60);
    const next = { ...(p.data as Record<string, unknown>), category: value || undefined };
    const validated = validateProfileData(p.type as ProfileType, next);
    await repo.profiles.update(profileId, { data: validated as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdateContactChannels(profileId: string, input: unknown, primaryAction: string): Promise<OpResult> {
  try {
    const profile = await adminProfile(profileId);
    const rows = z.array(contactChannelInputSchema).max(11).parse(input);
    const allowedPrimary = primaryAction === "share" || rows.some((row) => row.type === primaryAction && row.enabled && row.public);
    if (!allowedPrimary) return { ok: false, error: "Primary action must be public and enabled." };
    if (profile.type === "kids" && rows.some((row) => !["call", "sms", "whatsapp", "vcard"].includes(row.type))) {
      return { ok: false, error: "Protect profiles only support guardian-safe contact actions." };
    }
    await repo.profiles.update(profileId, {
      data: withProfileExperience(profile.data, {
        contactChannels: rows.map((row) => ({ ...row, value: row.value || null })),
        primaryContactAction: primaryAction,
      }) as never,
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdateShareSettings(profileId: string, input: { title: string; description: string }): Promise<OpResult> {
  try {
    const profile = await adminProfile(profileId);
    const parsed = z.object({ title: z.string().max(90), description: z.string().max(220) }).parse(input);
    await repo.profiles.update(profileId, {
      data: withProfileExperience(profile.data, { shareTitle: parsed.title || null, shareDescription: parsed.description || null }) as never,
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdateFavoriteLinks(profileId: string, linkIds: string[]): Promise<OpResult> {
  try {
    const profile = await adminProfile(profileId);
    const requested = z.array(z.string()).max(2).parse(linkIds);
    const owned = new Set(profile.links.map((link) => link.id));
    if (requested.some((id) => !owned.has(id))) return { ok: false, error: "Invalid favorite link." };
    await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { favoriteLinkIds: requested }) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdatePaymentMethods(profileId: string, input: unknown): Promise<OpResult> {
  try {
    const profile = await adminProfile(profileId);
    if (profile.type === "kids") return { ok: false, error: "Payments are unavailable on Protect profiles." };
    const methods = z.array(paymentMethodSchema).max(5).parse(input);
    if (methods.some((method) => method.enabled && method.public && !normalizePaymentMethod(method))) {
      return { ok: false, error: "Invalid public payment destination." };
    }
    await repo.profiles.update(profileId, { data: withProfileExperience(profile.data, { paymentMethods: methods }) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opCreateLink(profileId: string, input: { type: string; label: string; url: string }) {
  try {
    const p = await adminProfile(profileId);
    const url = new URL(input.url).toString();
    if (!LINK_TYPES.includes(input.type)) return { ok: false as const, error: "Unknown link type." };
    const row = await repo.links.create(profileId, {
      type: input.type as ProfileLink["type"], label: input.label, url, sortOrder: p.links.length,
    });
    return { ok: true as const, link: row };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opUpdateLink(profileId: string, linkId: string, input: { type: string; label: string; url: string; visible: boolean }) {
  try {
    await adminProfile(profileId);
    const url = new URL(input.url).toString();
    if (!LINK_TYPES.includes(input.type)) return { ok: false as const, error: "Unknown link type." };
    const row = await repo.links.update(linkId, profileId, {
      type: input.type as ProfileLink["type"], label: input.label || null, url, visible: input.visible,
    });
    return { ok: true as const, link: row };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opDeleteLink(profileId: string, linkId: string) {
  try {
    await adminProfile(profileId);
    await repo.links.delete(linkId, profileId);
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opReorderLinks(profileId: string, ids: string[]) {
  try {
    await adminProfile(profileId);
    await Promise.all(ids.map((id, sortOrder) => repo.links.update(id, profileId, { sortOrder })));
    return { ok: true as const };
  } catch (e) { return { ok: false as const, error: (e as Error).message }; }
}

export async function opUpdatePresentation(profileId: string, sections: ProfileSectionConfig[]): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    const parsed = z.array(
      z.object({ id: z.custom<ProfileSectionId>((v) => typeof v === "string"), visible: z.boolean(), sortOrder: z.number().int() }),
    ).max(8).parse(sections);
    await repo.profiles.update(profileId, { data: withProfilePresentation(p.data, parsed) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdateLayout(profileId: string, layout: unknown): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    if (typeof layout !== "string" || !PROFILE_LAYOUTS.some(({ key }) => key === layout)) return { ok: false, error: "Unknown layout." };
    await repo.profiles.update(profileId, { data: withProfileLayout(p.data, layout as ProfileLayoutKey) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdatePalette(profileId: string, paletteKey: unknown): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    if (typeof paletteKey !== "string" || !PALETTES[paletteKey]) return { ok: false, error: "Unknown palette." };
    const data = p.data && typeof p.data === "object" ? p.data as Record<string, unknown> : {};
    await repo.profiles.update(profileId, { data: { ...data, palette: paletteKey } as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function opUpdateFloatingCta(profileId: string, cta: unknown): Promise<OpResult> {
  try {
    const p = await adminProfile(profileId);
    const parsed = floatingCtaSchema.parse(cta);
    const kids = p.type === "kids";
    if (kids && (parsed.behavior === "single" || parsed.menu.length > 0)) return { ok: false, error: "Protect profiles use guardian-safe orb accents only — no inbound call/pay actions." };
    await repo.profiles.update(profileId, { data: withFloatingCta(p.data, parsed) as never });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

import { z } from "zod";
import type { Profile } from "@/db/schema";
import { asKidsData, getProfileExperience, type StoredContactChannel } from "@/lib/profile-data";
import { getDict, type Locale } from "@/i18n/dict";

export const CONTACT_TYPES = ["call", "sms", "whatsapp", "messenger", "telegram", "viber", "line", "snapchat", "email", "vcard", "custom"] as const;
export type ContactType = typeof CONTACT_TYPES[number];
export type ContactActionType = ContactType | "share";

export const contactTypeSchema = z.enum(CONTACT_TYPES);
export const contactChannelInputSchema = z.object({
  type: contactTypeSchema,
  value: z.string().max(500).default(""),
  enabled: z.boolean(),
  public: z.boolean(),
  sortOrder: z.number().int().min(0).max(50),
});

const unsafeScheme = /^\s*(javascript|data|file):/i;

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${plus ? "+" : ""}${digits}`;
}

function safeHttpUrl(raw: string): string | null {
  if (!raw.trim() || unsafeScheme.test(raw)) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

function username(raw: string): string | null {
  const cleaned = raw.trim().replace(/^@/, "");
  return /^[A-Za-z0-9._-]{2,80}$/.test(cleaned) ? cleaned : null;
}

export function normalizeContactHref(type: ContactType, raw: string): string | null {
  if (unsafeScheme.test(raw)) return null;
  if (type === "call" || type === "sms" || type === "whatsapp") {
    const phone = normalizePhone(raw);
    if (!phone) return null;
    if (type === "call") return `tel:${phone}`;
    if (type === "sms") return `sms:${phone}`;
    if (type === "whatsapp") return `https://wa.me/${phone.replace(/\D/g, "")}`;
  }
  if (type === "email") {
    const email = raw.trim().toLowerCase();
    return z.string().email().safeParse(email).success ? `mailto:${email}` : null;
  }
  if (type === "custom") return safeHttpUrl(raw);
  if (type === "vcard") return raw.startsWith("/") ? raw : null;
  if (/^https?:\/\//i.test(raw)) return safeHttpUrl(raw);
  const handle = username(raw);
  if (!handle) return null;
  if (type === "messenger") return `https://m.me/${encodeURIComponent(handle)}`;
  if (type === "telegram") return `https://t.me/${encodeURIComponent(handle)}`;
  if (type === "viber") return `viber://pa?chatURI=${encodeURIComponent(handle)}`;
  if (type === "line") return `https://line.me/R/ti/p/${encodeURIComponent(handle)}`;
  if (type === "snapchat") return `https://www.snapchat.com/add/${encodeURIComponent(handle)}`;
  return null;
}

export type PublicContactAction = { type: ContactActionType; label: string; href: string | null; guardian?: boolean };

function contactLabel(type: ContactActionType, locale: Locale): string {
  const c = getDict(locale).contact;
  return ({
    call: c.call, sms: c.sms, whatsapp: c.whatsapp, messenger: c.messenger,
    telegram: c.telegram, viber: c.viber, line: c.line, snapchat: c.snapchat,
    email: c.email, vcard: c.vcard, custom: c.custom, share: c.share,
  } as const)[type];
}

export function publicContactActions(
  profile: Profile,
  channels: StoredContactChannel[],
  origin = "",
  locale: Locale = "en",
): PublicContactAction[] {
  const kids = profile.type === "kids" ? asKidsData(profile.data) : null;
  const guardianPhone = kids?.guardians.slice().sort((a, b) => a.priority - b.priority)[0]?.phone ?? "";
  const rows = channels.filter((row) => row.enabled && row.public).sort((a, b) => a.sortOrder - b.sortOrder);
  const actions = rows.flatMap((row): PublicContactAction[] => {
    const type = contactTypeSchema.safeParse(row.type);
    if (!type.success) return [];
    if (profile.type === "kids" && !["call", "sms", "whatsapp", "vcard"].includes(type.data)) return [];
    if (profile.type === "kids" && ["call", "sms", "whatsapp"].includes(type.data) && guardianPhone) {
      return [{ type: type.data, label: contactLabel(type.data, locale), href: null, guardian: true }];
    }
    let value = row.value ?? "";
    if (type.data === "call" || type.data === "sms") value = value || profile.phone || "";
    if (type.data === "email") value = profile.type === "kids" ? "" : (value || profile.email || "");
    if (type.data === "vcard") value = `/u/${encodeURIComponent(profile.username)}/contact.vcf`;
    const href = normalizeContactHref(type.data, value);
    return href ? [{ type: type.data, label: contactLabel(type.data, locale), href: origin && href.startsWith("/") ? `${origin}${href}` : href }] : [];
  });
  actions.push({ type: "share", label: contactLabel("share", locale), href: null });
  return actions;
}

export function resolvePrimaryAction(profile: Profile, actions: PublicContactAction[]): PublicContactAction {
  const selected = actions.find((action) => action.type === getProfileExperience(profile.data, profile.id).primaryContactAction);
  if (selected) return selected;
  const defaults: ContactActionType[] = profile.type === "creator" ? ["email", "whatsapp", "share"]
    : profile.type === "kids" ? ["call", "sms", "share"]
      : ["whatsapp", "call", "sms", "email", "share"];
  return defaults.map((type) => actions.find((action) => action.type === type)).find(Boolean) ?? actions[0]!;
}

export function contactEventType(type: ContactActionType) {
  return ({ call: "call_clicked", sms: "sms_clicked", whatsapp: "whatsapp_clicked", messenger: "messenger_clicked",
    telegram: "telegram_clicked", viber: "viber_clicked", line: "line_clicked", snapchat: "snapchat_clicked",
    email: "email_clicked", vcard: "vcard_downloaded", custom: "custom_contact_clicked", share: "profile_shared" } as const)[type];
}

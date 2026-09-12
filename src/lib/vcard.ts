import type { Profile } from "@/db/schema";
import type { StoredContactChannel } from "@/lib/profile-data";
import { asKidsData } from "@/lib/profile-data";
import { publicContactActions } from "@/lib/contact-channels";

function escapeVcard(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}
export function vcardFilename(name: string) {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "snaplink-contact"}.vcf`;
}

export function buildPublicVcard(profile: Profile, channels: StoredContactChannel[], canonicalUrl: string) {
  const allowed = new Set(publicContactActions(profile, channels).map((action) => action.type));
  const kids = profile.type === "kids" ? asKidsData(profile.data) : null;
  const guardian = kids?.guardians.slice().sort((a, b) => a.priority - b.priority)[0];
  const displayName = kids ? `${guardian?.name || guardian?.label || "Guardian"} — SnapLink Protect` : profile.displayName;
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcard(displayName)}`];
  const phone = kids ? guardian?.phone : profile.phone;
  if (phone && (allowed.has("call") || allowed.has("sms") || allowed.has("whatsapp"))) lines.push(`TEL;TYPE=CELL:${escapeVcard(phone)}`);
  if (!kids && profile.email && allowed.has("email")) lines.push(`EMAIL;TYPE=INTERNET:${escapeVcard(profile.email)}`);
  if (!kids && profile.website) lines.push(`URL:${escapeVcard(profile.website)}`);
  lines.push(`URL;TYPE=PROFILE:${escapeVcard(canonicalUrl)}`);
  if (!kids && profile.headline) lines.push(`TITLE:${escapeVcard(profile.headline)}`);
  if (!kids && profile.location) lines.push(`ADR;TYPE=WORK:;;;;${escapeVcard(profile.location)};;;`);
  lines.push("END:VCARD", "");
  return lines.join("\r\n");
}

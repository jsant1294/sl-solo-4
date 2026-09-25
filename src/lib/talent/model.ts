import { z } from "zod";

export const disciplines = ["athlete", "cheer", "actor", "dancer", "creator"] as const;
/** Athlete and cheer Talent Profiles are branded SnapTrack (your journey, your record — owner-updated, never automatic tracking). */
export const snapTrackDisciplines: readonly Discipline[] = ["athlete", "cheer"];
export const talentBrand = (primary: Discipline) => snapTrackDisciplines.includes(primary) ? "SnapTrack" : null;
export const goals = ["recruiting", "auditions", "bookings", "representation", "collaborations"] as const;
export const sections = ["reel", "facts", "portfolio", "credits", "achievements", "about", "documents", "contact"] as const;
export const localized = z.object({ en: z.string().max(4000).default(""), es: z.string().max(4000).default("") });
export type Copy = z.infer<typeof localized>;
export const copy = (en = "", es = ""): Copy => ({ en, es });
export const translate = (value: Copy, locale: "en" | "es") => value[locale] || value.en || value.es;
export function safeWebUrl(value: string): boolean {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) && !u.username && !u.password; } catch { return false; }
}
export function safeContactUrl(value: string): boolean {
  if (safeWebUrl(value)) return true;
  if (/^mailto:[^\s?@]+@[^\s?@]+\.[^\s?@]+$/.test(value)) return !/[\r\n]|%0[ad]/i.test(value);
  return /^tel:\+?[0-9 ()-]{5,25}$/.test(value);
}
const url = z.string().max(2000).refine(safeWebUrl, "Use an absolute http or https URL");
const optionalUrl = z.union([z.literal(""), url]).default("");
const id = z.string().min(1).max(100);
const publicRow = { id, visible: z.boolean().default(false) };
const discipline = z.enum(disciplines);
const mediaSchema = z.object({ ...publicRow, kind: z.enum(["image", "video"]), url, poster: optionalUrl, title: localized, caption: localized, alt: localized });
const factSchema = z.object({ ...publicRow, discipline: discipline.optional(), key: z.string().max(80), label: localized,
  value: z.discriminatedUnion("type", [z.object({ type: z.literal("text"), value: localized }), z.object({ type: z.literal("number"), value: z.number().finite(), unit: z.string().max(24) }), z.object({ type: z.literal("date"), value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })]), observedAt: z.string().max(40).default("") });
const creditSchema = z.object({ ...publicRow, discipline: discipline.optional(), title: localized, role: localized, organization: z.string().max(160), date: z.string().max(40), evidenceUrl: optionalUrl });
const achievementSchema = z.object({ ...publicRow, title: localized, issuer: z.string().max(160), date: z.string().max(40), evidenceUrl: optionalUrl });
const contactSchema = z.object({ ...publicRow, role: z.enum(["talent", "coach", "guardian", "agent", "manager"]), label: localized,
  destination: z.string().max(2000).refine(safeContactUrl, "Use a valid email, telephone, or web destination"), goals: z.array(z.enum(goals)).min(1).max(5) });
const documentSchema = z.object({ ...publicRow, kind: z.enum(["resume", "talent-sheet"]), title: localized, url, published: z.boolean().default(false) });
const moduleSchema = z.object({ version: z.literal(1), affiliation: localized, skills: localized, training: localized,
  // Optional discipline fields; no universal sports/academic/measurement requirements.
  sport: z.string().max(100).default(""), position: z.string().max(100).default(""), styles: localized, languages: localized, representation: localized, visible: z.boolean().default(false) });
export const talentSchema = z.object({
  version: z.literal(1), displayName: z.string().trim().min(1).max(100), headline: localized, bio: localized,
  portrait: optionalUrl, cover: optionalUrl, location: z.string().max(100).default(""), showLocation: z.boolean().default(false), youth: z.boolean().default(false),
  disciplines: z.array(discipline).min(1).max(5), primaryDiscipline: discipline,
  goals: z.array(z.enum(goals)).min(1).max(5), primaryGoal: z.enum(goals),
  modules: z.object({ athlete: moduleSchema.optional(), cheer: moduleSchema.optional(), actor: moduleSchema.optional(), dancer: moduleSchema.optional(), creator: moduleSchema.optional() }).default({}),
  media: z.array(mediaSchema).max(40).default([]), featuredReelId: z.string().default(""), facts: z.array(factSchema).max(40).default([]),
  credits: z.array(creditSchema).max(60).default([]), achievements: z.array(achievementSchema).max(40).default([]),
  contacts: z.array(contactSchema).max(10).default([]), primaryContactId: z.string().default(""), documents: z.array(documentSchema).max(10).default([]),
  links: z.array(z.object({ ...publicRow, label: localized, url })).max(30).default([]),
  presentation: z.object({ theme: z.enum(["ivory", "obsidian", "signature_gold"]).default("ivory"),
    sections: z.array(z.object({ id: z.enum(sections), visible: z.boolean() })).length(sections.length).default(sections.map(id => ({ id, visible: true }))) }).default({}),
  sample: z.boolean().default(false),
}).superRefine((p, ctx) => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
  if (!p.disciplines.includes(p.primaryDiscipline)) issue("primaryDiscipline", "Select the primary discipline");
  if (!p.goals.includes(p.primaryGoal)) issue("primaryGoal", "Select the primary goal");
  for (const key of ["media", "facts", "credits", "achievements", "contacts", "documents", "links"] as const) if (new Set(p[key].map(r => r.id)).size !== p[key].length) issue(key, "Duplicate item IDs");
  if (new Set(p.presentation.sections.map(s => s.id)).size !== sections.length) issue("presentation", "Each section must appear once");
  if (p.featuredReelId && !p.media.some(m => m.id === p.featuredReelId && m.kind === "video")) issue("featuredReelId", "Choose an existing video");
  if (p.primaryContactId && !p.contacts.some(c => c.id === p.primaryContactId && c.visible && c.goals.includes(p.primaryGoal) && (!p.youth || c.role !== "talent"))) issue("primaryContactId", "Choose a public recipient for the primary goal (guardian or representative for youth)");
});
export type Talent = z.infer<typeof talentSchema>;
export type Discipline = typeof disciplines[number];
export type TalentEnvelope = { revision: number; draft: Talent; published: Talent | null };
export const envelopeSchema = z.object({ revision: z.number().int().nonnegative(), draft: talentSchema, published: talentSchema.nullable() });
export function hasTalent(data: unknown): boolean { return !!data && typeof data === "object" && "talent" in data; }
export function readEnvelope(data: unknown): TalentEnvelope | null {
  const parsed = envelopeSchema.safeParse((data as { talent?: unknown } | null)?.talent);
  return parsed.success ? parsed.data : null;
}
export function newTalent(name: string, primary: Discipline = "athlete"): Talent {
  return talentSchema.parse({ version: 1, displayName: name || "Talent", headline: copy(), bio: copy(), disciplines: [primary], primaryDiscipline: primary,
    goals: [primary === "athlete" || primary === "cheer" ? "recruiting" : "auditions"], primaryGoal: primary === "athlete" || primary === "cheer" ? "recruiting" : "auditions" });
}
export function newModule(): Talent["modules"][Discipline] {
  return moduleSchema.parse({ version: 1, affiliation: copy(), skills: copy(), training: copy(), styles: copy(), languages: copy(), representation: copy() });
}
/** Explicit allowlist: private destinations and inactive modules never reach public components. */
export function projectTalent(raw: Talent): Talent {
  const p = talentSchema.parse(raw);
  const visible = <T extends { visible: boolean }>(rows: T[]) => rows.filter(r => r.visible);
  const shown = (section: typeof sections[number]) => p.presentation.sections.some(s => s.id === section && s.visible);
  const media = visible(p.media).filter(m => shown("portfolio") || (shown("reel") && m.id === p.featuredReelId));
  const contacts = shown("contact") ? visible(p.contacts).filter(c => !p.youth || c.role !== "talent") : [];
  return { ...p, location: p.showLocation ? p.location : "", bio: shown("about") ? p.bio : copy(),
    modules: shown("about") ? Object.fromEntries(Object.entries(p.modules).filter(([key, m]) => p.disciplines.includes(key as Discipline) && m?.visible)) : {},
    media, featuredReelId: shown("reel") && media.some(m => m.id === p.featuredReelId) ? p.featuredReelId : "",
    facts: shown("facts") ? visible(p.facts).filter(f => !f.discipline || p.disciplines.includes(f.discipline)) : [],
    credits: shown("credits") ? visible(p.credits).filter(c => !c.discipline || p.disciplines.includes(c.discipline)) : [],
    achievements: shown("achievements") ? visible(p.achievements) : [], contacts,
    primaryContactId: contacts.some(c => c.id === p.primaryContactId) ? p.primaryContactId : "",
    documents: shown("documents") ? visible(p.documents).filter(d => d.published) : [], links: shown("contact") ? visible(p.links) : [] };
}
/** Public read boundary shared by HTML, metadata, OG, and contact exports. Fail closed. */
export function projectProfile<T extends { data: unknown; status: string; locale: "en" | "es" }>(profile: T): T | undefined {
  if (!hasTalent(profile.data)) return profile;
  const envelope = readEnvelope(profile.data);
  if (profile.status !== "active" || !envelope) return undefined;
  // Never-published Talent drafts stay private; the existing public profile keeps serving.
  if (!envelope.published) { const { talent: _draft, ...rest } = profile.data as Record<string, unknown>; return { ...profile, data: rest }; }
  const p = projectTalent(envelope.published);
  return { ...profile, displayName: p.displayName, headline: translate(p.headline, profile.locale), bio: translate(p.bio, profile.locale), avatarUrl: p.portrait || null,
    location: p.location || null, phone: null, email: null, website: null, links: [], contactChannels: [], theme: p.presentation.theme,
    data: { talent: { revision: envelope.revision, draft: p, published: p } } };
}

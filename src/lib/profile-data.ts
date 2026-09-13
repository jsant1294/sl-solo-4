import { z } from "zod";

/**
 * Per-type profile payloads stored in profiles.data (jsonb).
 * Decision: typed JSON keyed by profileType instead of columns-per-type.
 * Validation is enforced here on every write. Kids carries privacy rules
 * that the schema alone can't express.
 */

export type ProfileType = "personal" | "business" | "kids";

/* — Kids — */
export const guardianSchema = z.object({
  label: z.string().min(1).max(24),           // "Mom", "Dad", "Aunt Rosa"
  name: z.string().min(1).max(60),
  relationship: z.string().max(40).optional(),
  phone: z.string().min(5).max(24),
  priority: z.number().int().min(1).max(9).default(1),
});
export type Guardian = z.infer<typeof guardianSchema>;

export const kidsDataSchema = z.object({
  /**
   * PRIVACY: first name / nickname ONLY. We label the field so guardians
   * don't type a full legal name. Enforced soft (length) + documented.
   */
  firstName: z.string().min(1).max(24),
  helpMessage: z.string().max(140).optional(),
  /** Photo is opt-in and off by default; monogram is the safe default. */
  usePhoto: z.boolean().default(false),
  guardians: z.array(guardianSchema).min(1).max(4),
  emergency: z.object({
    allergies: z.string().max(200).optional(),
    note: z.string().max(300).optional(),
    medical: z.string().max(300).optional(),
    /** Emergency block is opt-in; collapsed + never in initial page source. */
    enabled: z.boolean().default(false),
  }).optional(),
}).passthrough().superRefine((val, ctx) => {
  // Guardians must have at least one priority-1 contact.
  if (!val.guardians.some((g) => g.priority === 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "One guardian must be priority 1", path: ["guardians"] });
  }
});
export type KidsData = z.infer<typeof kidsDataSchema>;

/* — Personal / Business share a light shape (fields already on the row) — */
export const personalDataSchema = z.object({}).passthrough().default({});
export const businessDataSchema = z.object({
  category: z.string().max(60).optional(),
}).passthrough().default({});

export type ProfileData =
  | Record<string, never>
  | KidsData
  | z.infer<typeof businessDataSchema>;

/** Validate a data payload for a given type. Throws on invalid. */
export function validateProfileData(type: ProfileType, data: unknown): ProfileData {
  switch (type) {
    case "kids": return kidsDataSchema.parse(data);
    case "business": return businessDataSchema.parse(data);
    case "personal": return personalDataSchema.parse(data);
  }
}

export function isKids(type: string): boolean {
  return type === "kids";
}

/** Type guard for reading kids payloads at render time. */
export function asKidsData(data: unknown): KidsData | null {
  const r = kidsDataSchema.safeParse(data);
  return r.success ? r.data : null;
}

export type StoredContactChannel = { id: string; profileId: string; type: string; value: string | null; enabled: boolean; public: boolean; sortOrder: number; createdAt: Date; updatedAt: Date };
export type StoredPaymentMethod = { type: "venmo" | "cashapp" | "paypal" | "zelle" | "custom"; value: string; label?: string; enabled: boolean; public: boolean; sortOrder: number };
export type ProfileExperienceSettings = {
  contactChannels: StoredContactChannel[];
  primaryContactAction: string | null;
  shareTitle: string | null;
  shareDescription: string | null;
  shareImageUrl: string | null;
  favoriteLinkIds: string[];
  paymentMethods: StoredPaymentMethod[];
  avatarShape: "round" | "square";
};

export function getProfileExperience(data: unknown, profileId = ""): ProfileExperienceSettings {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const experience = raw.experience && typeof raw.experience === "object" ? raw.experience as Record<string, unknown> : {};
  const stored = Array.isArray(experience.contactChannels) ? experience.contactChannels : [];
  const contactChannels = stored.flatMap((item, index): StoredContactChannel[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return typeof row.type === "string" ? [{ id: `stored-${row.type}`, profileId, type: row.type, value: typeof row.value === "string" ? row.value : null, enabled: row.enabled === true, public: row.public === true, sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index, createdAt: new Date(0), updatedAt: new Date(0) }] : [];
  });
  const text = (key: string) => typeof experience[key] === "string" && experience[key] ? experience[key] as string : null;
  const favoriteLinkIds = Array.isArray(experience.favoriteLinkIds) ? experience.favoriteLinkIds.filter((value): value is string => typeof value === "string").slice(0, 2) : [];
  const paymentMethods = Array.isArray(experience.paymentMethods) ? experience.paymentMethods.flatMap((item, index): StoredPaymentMethod[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (!["venmo", "cashapp", "paypal", "zelle", "custom"].includes(String(row.type)) || typeof row.value !== "string") return [];
    return [{ type: row.type as StoredPaymentMethod["type"], value: row.value, label: typeof row.label === "string" ? row.label : undefined, enabled: row.enabled === true, public: row.public === true, sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index }];
  }) : [];
  const avatarShape = experience.avatarShape === "square" ? "square" : "round";
  return { contactChannels, primaryContactAction: text("primaryContactAction"), shareTitle: text("shareTitle"), shareDescription: text("shareDescription"), shareImageUrl: text("shareImageUrl"), favoriteLinkIds, paymentMethods, avatarShape };
}

export function withProfileExperience(data: unknown, patch: Partial<Omit<ProfileExperienceSettings, "contactChannels">> & { contactChannels?: Array<{ type: string; value: string | null; enabled: boolean; public: boolean; sortOrder: number }> }) {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const current = raw.experience && typeof raw.experience === "object" ? raw.experience as Record<string, unknown> : {};
  return { ...raw, experience: { ...current, ...patch } };
}

/**
 * PROFILE PRESENTATION — section visibility + ordering for the public
 * renderer. Shared-domain config stored under profiles.data.presentation.
 * The section catalog below maps 1:1 to blocks that actually exist in the
 * public profile renderers (no placeholder modules are invented here). The
 * customer Studio does not surface this today; operators do via the control
 * plane. Default: all sections visible, catalog order.
 */
export const PROFILE_SECTIONS = [
  { id: "identity", label: "Identity" },
  { id: "bio", label: "About / Bio" },
  { id: "quickActions", label: "Quick actions + contact orb" },
  { id: "featuredLinks", label: "Featured links" },
  { id: "socialLinks", label: "Social links" },
  { id: "moreLinks", label: "More links" },
  { id: "contactSheet", label: "Contact form" },
] as const;
export type ProfileSectionId = typeof PROFILE_SECTIONS[number]["id"];
export type ProfileSectionConfig = { id: string; visible: boolean; sortOrder: number };

/** Merge stored config over the authoritative catalog; always complete. */
export function getProfilePresentation(data: unknown): ProfileSectionConfig[] {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const presentation = raw.presentation && typeof raw.presentation === "object" ? raw.presentation as { sections?: unknown } : {};
  const stored = Array.isArray(presentation.sections) ? presentation.sections : [];
  const seen = new Map<string, ProfileSectionConfig>();
  stored.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !PROFILE_SECTIONS.some((s) => s.id === row.id)) return;
    seen.set(row.id, {
      id: row.id,
      visible: row.visible !== false,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : index,
    });
  });
  return PROFILE_SECTIONS.map((s, index) => seen.get(s.id) ?? { id: s.id, visible: true, sortOrder: index });
}

export function withProfilePresentation(data: unknown, sections: ProfileSectionConfig[]) {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return { ...raw, presentation: { sections } };
}

/* ————————————————————————————————————————
 * PROFILE LAYOUT — composition, independent of color palette and data.
 * One profile row renders through any layout; content is never copied or
 * duplicated per layout. Stored as profiles.data.layout (validated here).
 * This is the shared-domain source the customer/operator UIs and the
 * public renderers all read from.
 * ———————————————————————————————————————— */
export const PROFILE_LAYOUTS = [
  { key: "classic", label: "Classic", description: "Balanced profile card structure." },
  { key: "editorial", label: "Editorial", description: "Large typography, spacious sections, premium presentation." },
  { key: "portfolio", label: "Portfolio", description: "Media-forward layout for photographers, designers and artists." },
  { key: "creator", label: "Creator", description: "Identity first, social links and content emphasized." },
  { key: "business", label: "Business Pro", description: "CTA and conversion-forward structure." },
  { key: "minimal", label: "Minimal", description: "Compact, clean, highly scannable." },
] as const;
export type ProfileLayoutKey = typeof PROFILE_LAYOUTS[number]["key"];

const LAYOUT_KEYS = new Set<string>(PROFILE_LAYOUTS.map((l) => l.key));

/** Stored layout key, verified against the curated catalog. Defaults to classic. */
export function getProfileLayout(data: unknown): ProfileLayoutKey {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const stored = raw.layout;
  return typeof stored === "string" && LAYOUT_KEYS.has(stored) ? stored as ProfileLayoutKey : "classic";
}

export function withProfileLayout(data: unknown, layout: ProfileLayoutKey) {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  if (!LAYOUT_KEYS.has(layout)) layout = "classic";
  return { ...raw, layout };
}

/* ————————————————————————————————————————
 * FLOATING CTA / action orb — one orb that either opens the full
 * contact menu (behavior: "menu", following the contact channels the
 * operator keeps public) or fires a single primary action. Position,
 * style and tint are composed from the palette so the orb always reads
 * on-brand with zero extra config. Kids profiles only ever surface the
 * orb with guardian-safe channels (accent-only), never a payment/Pay orb.
 * ———————————————————————————————————————— */
export const FLOATING_CTA_ACTION_TYPES = ["call", "sms", "whatsapp", "email", "vcard", "pay", "share", "custom"] as const;
export type FloatingCtaActionType = typeof FLOATING_CTA_ACTION_TYPES[number];

export const floatingCtaMenuSchema = z.object({
  type: z.enum(FLOATING_CTA_ACTION_TYPES),
  label: z.string().max(40).optional(),
  value: z.string().max(200).optional(),
  visible: z.boolean().default(true),
});
export type FloatingCtaMenuItem = z.infer<typeof floatingCtaMenuSchema>;

export const floatingCtaSchema = z.object({
  enabled: z.boolean().default(false),
  behavior: z.enum(["menu", "single"]).default("menu"),
  /** single-action primary; ignored when behavior === "menu" */
  primaryType: z.enum(FLOATING_CTA_ACTION_TYPES).default("custom"),
  primaryLabel: z.string().max(24).default(""),
  primaryHref: z.string().max(200).optional(),
  position: z.enum(["bottom-right", "bottom-center", "bottom-left"]).default("bottom-right"),
  style: z.enum(["solid", "glass", "outline"]).default("solid"),
  menu: z.array(floatingCtaMenuSchema).max(5).default([]),
  /** optional accent override; falls back to the active palette gold */
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  /** safe-area aware; defaults on so the orb never sits under a home bar */
  safeArea: z.boolean().default(true),
}).passthrough().default({});
export type FloatingCtaConfig = z.infer<typeof floatingCtaSchema>;

export function getFloatingCta(data: unknown): FloatingCtaConfig {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const stored = raw.floatingCta;
  const parsed = floatingCtaSchema.safeParse(stored ?? {});
  return parsed.success ? parsed.data : floatingCtaSchema.parse({});
}

export function withFloatingCta(data: unknown, config: Partial<FloatingCtaConfig>): Record<string, unknown> {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  return { ...raw, floatingCta: getFloatingCta({ ...raw, floatingCta: config ? { ...(typeof raw.floatingCta === "object" && raw.floatingCta !== null ? (raw.floatingCta as Record<string, unknown>) : {}), ...config } : undefined }) };
}

export function withFloatingCtaItems(data: unknown, items: FloatingCtaMenuItem[]): Record<string, unknown> {
  const current = getFloatingCta(data);
  return withFloatingCta(data, { menu: items } satisfies Partial<FloatingCtaConfig>);
}

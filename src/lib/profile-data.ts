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
  return { contactChannels, primaryContactAction: text("primaryContactAction"), shareTitle: text("shareTitle"), shareDescription: text("shareDescription"), shareImageUrl: text("shareImageUrl"), favoriteLinkIds, paymentMethods };
}

export function withProfileExperience(data: unknown, patch: Partial<Omit<ProfileExperienceSettings, "contactChannels">> & { contactChannels?: Array<{ type: string; value: string | null; enabled: boolean; public: boolean; sortOrder: number }> }) {
  const raw = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const current = raw.experience && typeof raw.experience === "object" ? raw.experience as Record<string, unknown> : {};
  return { ...raw, experience: { ...current, ...patch } };
}

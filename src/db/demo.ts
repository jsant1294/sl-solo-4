import type { Profile, ProfileLink, ContactLead } from "./schema";
import { nanoid } from "nanoid";
import type { StoredContactChannel } from "@/lib/profile-data";
import type { KidsData } from "@/lib/profile-data";

/**
 * DEMO DATA LAYER — mirrors schema.ts exactly. Swap getters for Drizzle
 * queries to go live; pages don't change. Seam marker: // @wire
 *
 * Ownership: everything hangs off userId. OWNER_USER_ID is the "signed-in"
 * account for the shell. getOwnedProfiles() scopes by it — the same scoping
 * a real session would enforce server-side.
 */

export const OWNER_USER_ID = "u_jose";

export type DemoProfile = Profile & { links: ProfileLink[]; contactChannels: StoredContactChannel[]; destinationToken: string };

const iso = (d: string) => new Date(d);

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "demo_personal", userId: OWNER_USER_ID, type: "personal", status: "active",
    username: "jose", displayName: "Jose Santiago", headline: "Chef · Creator · Entrepreneur",
    bio: "Building visibility infrastructure. 38 years on the line, now shipping software and hardware.",
    avatarUrl: null, phone: "+14045550142", email: "jose@example.com",
    website: "https://southlineone.example", location: "Alpharetta, GA",
    accent: null, theme: "obsidian", locale: "en", data: {}, active: true, createdAt: iso("2025-01-10"),
    destinationToken: "dst_jose01",
    links: [
      { id: "l1", profileId: "demo_personal", type: "instagram", label: "Instagram", url: "https://instagram.com/jsant1294", sortOrder: 0, visible: true },
      { id: "l2", profileId: "demo_personal", type: "website", label: "Southline One", url: "https://southlineone.example", sortOrder: 1, visible: true },
    ],
    contactChannels: [],
  },
  {
    id: "demo_business", userId: OWNER_USER_ID, type: "business", status: "active",
    username: "rociostudio", displayName: "Rocío Studio", headline: "Portrait & Brand Photography",
    bio: "Natural-light portraits, family sessions, brand work. Studio in Roswell. EN / ES.",
    avatarUrl: null, phone: "+14045550188", email: "hello@rociostudio.example",
    website: "https://rociostudio.example", location: "Roswell, GA",
    accent: null, theme: "ivory", locale: "es", data: { category: "Photography" }, active: true, createdAt: iso("2025-02-02"),
    destinationToken: "dst_rocio1",
    links: [
      { id: "l4", profileId: "demo_business", type: "instagram", label: "Instagram", url: "https://instagram.com/rociostudio", sortOrder: 0, visible: true },
      { id: "l5", profileId: "demo_business", type: "website", label: "Book a session", url: "https://rociostudio.example/book", sortOrder: 1, visible: true },
    ],
    contactChannels: [],
  },
  {
    id: "demo_kids", userId: OWNER_USER_ID, type: "kids", status: "active",
    username: "k7f3q9xz", displayName: "Sofia", headline: null,
    bio: null, avatarUrl: null, phone: null, email: null, website: null, location: null,
    accent: "#E86FA6", theme: "ivory", locale: "en", active: true, createdAt: iso("2025-03-01"),
    destinationToken: "dst_sofia9",
    data: {
      firstName: "Sofia",
      helpMessage: "If I need help, please contact my parent or guardian.",
      usePhoto: false,
      guardians: [
        { label: "Mom", name: "Ana", relationship: "Mother", phone: "+14045550101", priority: 1 },
        { label: "Dad", name: "Jose", relationship: "Father", phone: "+14045550142", priority: 2 },
      ],
      emergency: { allergies: "Peanuts", note: undefined, medical: undefined, enabled: true },
    } as KidsData,
    links: [],
    contactChannels: [],
  },
];

// @wire replace with: db.select().from(profiles).where(eq(profiles.username, u))
export function getDemoProfile(username: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.username === username.toLowerCase());
}

// @wire resolve destination token → profile (the real public routing path)
export function getProfileByDestination(token: string): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.destinationToken === token);
}

// @wire scope by session account server-side
export function getOwnedProfiles(userId: string = OWNER_USER_ID): DemoProfile[] {
  return DEMO_PROFILES.filter((p) => p.userId === userId);
}

export function getOwnedProfile(id: string, userId: string = OWNER_USER_ID): DemoProfile | undefined {
  return DEMO_PROFILES.find((p) => p.id === id && p.userId === userId);
}

export const DEMO_DEVICES: Record<string, { label: string; type: string; status: string }[]> = {
  demo_kids: [
    { label: "Pink Backpack Tag", type: "sticker", status: "paired" },
    { label: "Kids Bracelet", type: "bracelet", status: "paired" },
  ],
  demo_personal: [{ label: "Wallet Card", type: "card", status: "paired" }],
  demo_business: [{ label: "Table Stand", type: "stand", status: "paired" }],
};

export const DEMO_ACTIVITY = {
  today: { tap: 12, qr_scan: 4, profile_view: 31, contact: 3 },
  d7: { tap: 68, qr_scan: 22, profile_view: 190, contact: 14 },
  d30: { tap: 240, qr_scan: 81, profile_view: 712, contact: 47 },
  trend: [4, 6, 3, 8, 5, 9, 7, 11, 6, 8, 10, 5, 7, 12, 9, 6, 8, 14, 10, 7, 9, 11, 8, 13, 10, 12, 9, 15, 11, 12],
};

export const DEMO_LEADS: Pick<ContactLead, "name" | "phone" | "email" | "message" | "createdAt">[] = [
  { name: "Dana W.", phone: "+14045550111", email: "dana@example.com", message: "Saw your card at the expo — need a kitchen quote.", createdAt: iso("2025-04-01T14:22:00") },
  { name: "Luis M.", phone: "+14045550133", email: null, message: null, createdAt: iso("2025-04-01T11:05:00") },
  { name: "Priya S.", phone: null, email: "priya@example.com", message: "Available for a June brand shoot?", createdAt: iso("2025-03-31T18:40:00") },
];

/**
 * DEMO LEAD SUBMISSIONS — in-memory store for real /api/leads POSTs when
 * DATABASE_URL isn't set. Denormalizes profileUsername/profileDisplayName
 * onto each row (same snapshot approach as OrderItem.productName) so
 * /operator/leads doesn't need a second lookup in demo mode.
 */
export type DemoLead = ContactLead & { profileUsername: string; profileDisplayName: string };
const DEMO_LEAD_SUBMISSIONS: DemoLead[] = [];

export function addDemoLead(input: {
  profileId: string; profileUsername: string; profileDisplayName: string;
  name?: string; phone?: string; email?: string; message?: string; source?: string; createdAt?: Date;
}): DemoLead {
  const lead: DemoLead = {
    id: `lead_${nanoid(10)}`, profileId: input.profileId,
    name: input.name ?? null, phone: input.phone ?? null, email: input.email ?? null,
    message: input.message ?? null, source: input.source ?? null,
    submissionFingerprint: null,
    createdAt: input.createdAt ?? new Date(),
    profileUsername: input.profileUsername, profileDisplayName: input.profileDisplayName,
  };
  DEMO_LEAD_SUBMISSIONS.push(lead);
  return lead;
}

export function listDemoLeads(): DemoLead[] {
  return [...DEMO_LEAD_SUBMISSIONS].sort((a, b) => +b.createdAt - +a.createdAt);
}

export function recentDemoDuplicate(profileId: string, contact: { email?: string; phone?: string }, withinMs: number): boolean {
  const since = Date.now() - withinMs;
  return DEMO_LEAD_SUBMISSIONS.some((lead) =>
    lead.profileId === profileId && +lead.createdAt >= since &&
    ((contact.email && lead.email === contact.email) || (contact.phone && lead.phone === contact.phone)));
}

/** Test-only: clear submissions between test cases so state doesn't leak across files. */
export function _resetDemoLeadsForTests() {
  DEMO_LEAD_SUBMISSIONS.length = 0;
}

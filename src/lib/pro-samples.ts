import type { Profile, ProfileLink } from "@/db/schema";
import type { StoredContactChannel } from "@/lib/profile-data";

/**
 * Fictional professional samples rendered with the real StandardProfile renderer, so shoppers see
 * exactly what a nurse / realtor SnapLink looks like. 555 numbers and example.com
 * destinations only. Never persisted.
 */
export const proSampleKeys = ["nurse", "realtor"] as const;
export type ProSampleKey = typeof proSampleKeys[number];
export type ProSample = Profile & { links: ProfileLink[]; contactChannels: StoredContactChannel[] };

const now = new Date("2026-01-01T00:00:00.000Z");
type Spec = {
  name: string; theme: Profile["theme"]; accent: string; primary: string; location: string;
  headline: [string, string]; bio: [string, string];
  channels: [string, string][]; links: [type: ProfileLink["type"], en: string, es: string][];
};
const specs: Record<ProSampleKey, Spec> = {
  nurse: {
    name: "Danielle Brooks, RN", theme: "ivory", accent: "#3F7F8C", primary: "email", location: "Houston, Texas",
    headline: ["Registered Nurse · ICU · BSN", "Enfermera registrada · UCI · BSN"],
    bio: ["Eight years in critical care. Calm under pressure, fluent in English and Spanish, and ready for my next unit. (Sample profile — fictional.)",
      "Ocho años en cuidados intensivos. Tranquila bajo presión, bilingüe y lista para mi próxima unidad. (Perfil de ejemplo — ficticio.)"],
    channels: [["email", "danielle.sample@example.com"], ["call", "+17135550142"], ["sms", "+17135550142"]],
    links: [["website", "Verify my RN license", "Verificar mi licencia RN"], ["custom", "Resume (PDF)", "Currículum (PDF)"], ["linkedin", "LinkedIn", "LinkedIn"]],
  },
  realtor: {
    name: "Sofia Martinez", theme: "ivory", accent: "#B78A32", primary: "sms", location: "Austin, Texas",
    headline: ["Realtor · Helping families buy & sell in Austin", "Agente inmobiliaria · Ayudo a familias a comprar y vender en Austin"],
    bio: ["First home or forever home — I'll get you there. Se habla español. (Sample profile — fictional.)",
      "Primera casa o la casa para siempre — te acompaño. Hablo español. (Perfil de ejemplo — ficticio.)"],
    channels: [["sms", "+15125550163"], ["call", "+15125550163"], ["email", "sofia.sample@example.com"], ["whatsapp", "+15125550163"]],
    links: [["website", "Browse my listings", "Ver mis propiedades"], ["custom", "Book a showing", "Agendar una visita"], ["instagram", "Instagram", "Instagram"]],
  },
};

export function proSampleProfile(key: ProSampleKey, locale: "en" | "es", avatarUrl: string | null = null): ProSample {
  const s = specs[key]; const es = locale === "es"; const id = `sample-${key}`;
  const contactChannels: StoredContactChannel[] = s.channels.map(([type, value], sortOrder) => ({
    id: `${id}-${type}`, profileId: id, type, value, enabled: true, public: true, sortOrder, createdAt: now, updatedAt: now,
  }));
  const links: ProfileLink[] = s.links.map(([type, en, esLabel], sortOrder) => ({
    id: `${id}-link-${sortOrder}`, profileId: id, type, label: es ? esLabel : en, url: `https://example.com/sample/${key}/${sortOrder}`, sortOrder, visible: true,
  }));
  return {
    id, userId: "sample-user", type: "personal", status: "active", username: `sample-${key}`,
    displayName: s.name, headline: es ? s.headline[1] : s.headline[0], bio: es ? s.bio[1] : s.bio[0],
    avatarUrl, phone: null, email: null, website: null, location: s.location, accent: s.accent, theme: s.theme, locale,
    data: { experience: {
      contactChannels: contactChannels.map(({ type, value, enabled, public: visible, sortOrder }) => ({ type, value, enabled, public: visible, sortOrder })),
      primaryContactAction: s.primary, shareTitle: null, shareDescription: null, shareImageUrl: null,
      favoriteLinkIds: [links[0].id, links[1].id], paymentMethods: [],
    } },
    active: true, createdAt: now, links, contactChannels,
  };
}

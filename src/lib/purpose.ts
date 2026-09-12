import type { HomeProduct } from "@/components/home-experiences";
import type { PurposeOption } from "@/db/schema";

export type PurposeKey = "personal" | "creator" | "professional" | "share" | "protect" | "kids";

export type Purpose = {
  key: PurposeKey;
  title: string; titleEs: string;
  tagline: string; taglineEs: string;
  color: string; // CSS custom property name, e.g. "coral" -> hsl(var(--coral))
  types: string[]; // profileTypesSupported values this purpose matches
  preferredSlugs: string[]; // tie-break order among matched products
  headline: string; headlineEs: string;
  description: string; descriptionEs: string;
  chips: string[]; chipsEs: string[];
  secondaryHref: string;
  privacyPoints?: { t: string; tEs: string; b: string; bEs: string }[];
  characterTeaser?: string[];
};

/**
 * Structural hardware-matching logic — NOT CMS-editable. A typo here
 * silently breaks recommendations rather than just looking wrong, so it
 * stays code-reviewed. Everything else about a purpose (copy, color,
 * on/off) is CMS-editable via purpose_options — see purposesFromRows().
 */
const purposeStructure: Record<PurposeKey, { types: string[]; preferredSlugs: string[] }> = {
  personal: { types: ["personal"], preferredSlugs: ["phone-tag", "nfc-card", "keychain"] },
  creator: { types: ["creator"], preferredSlugs: ["nfc-card", "phone-tag", "keychain"] },
  professional: { types: ["professional", "business"], preferredSlugs: ["nfc-card", "phone-tag", "table-stand"] },
  share: { types: ["personal", "creator"], preferredSlugs: ["phone-tag", "nfc-card", "keychain"] },
  protect: { types: ["personal", "kids"], preferredSlugs: ["keychain", "bracelet", "kids-backpack-tag"] },
  kids: { types: ["kids"], preferredSlugs: ["kids-backpack-tag", "bracelet"] },
};

/** Demo-mode content fallback (no DATABASE_URL) — same role DEMO_PRODUCTS plays for products. */
const demoPurposeContent: Omit<Purpose, "types" | "preferredSlugs">[] = [
  {
    key: "personal",
    title: "Personal", titleEs: "Personal",
    tagline: "Share who you are and how people can reach you.",
    taglineEs: "Comparte quién eres y cómo pueden contactarte.",
    color: "coral",
    headline: "Your identity. One tap away.",
    headlineEs: "Tu identidad. A un toque de distancia.",
    description: "Give anyone you meet a fast, complete way to save and reach you — no typing, no app.",
    descriptionEs: "Dale a cualquiera que conozcas una forma rápida y completa de guardarte y contactarte — sin escribir, sin app.",
    chips: ["Phone", "Text", "WhatsApp", "Email", "Save Contact", "Social links", "Website", "Share profile"],
    chipsEs: ["Teléfono", "Mensaje", "WhatsApp", "Correo", "Guardar contacto", "Redes sociales", "Sitio web", "Compartir perfil"],
    secondaryHref: "/hardware",
  },
  {
    key: "creator",
    title: "Creator", titleEs: "Creador",
    tagline: "Send people to your content, socials, portfolio, store and work.",
    taglineEs: "Lleva a las personas a tu contenido, redes, portafolio, tienda y trabajo.",
    color: "violet",
    headline: "Turn every introduction into a connection.",
    headlineEs: "Convierte cada presentación en una conexión.",
    description: "One tap sends people straight to the work, platforms and links that matter most to you.",
    descriptionEs: "Un toque lleva a las personas directo al trabajo, plataformas y enlaces que más te importan.",
    chips: ["Instagram", "TikTok", "YouTube", "Portfolio", "Website", "Store", "Booking", "WhatsApp", "Save Contact"],
    chipsEs: ["Instagram", "TikTok", "YouTube", "Portafolio", "Sitio web", "Tienda", "Reservas", "WhatsApp", "Guardar contacto"],
    secondaryHref: "/hardware",
  },
  {
    key: "professional",
    title: "Professional", titleEs: "Profesional",
    tagline: "Turn introductions into opportunities and make follow-up easy.",
    taglineEs: "Convierte presentaciones en oportunidades y facilita el seguimiento.",
    color: "blue",
    headline: "Make the next step easy.",
    headlineEs: "Facilita el siguiente paso.",
    description: "Share your contact details, booking link and work in one tap — SOLO Professional stays SOLO.",
    descriptionEs: "Comparte tu contacto, enlace de reservas y trabajo en un toque — SOLO Profesional sigue siendo SOLO.",
    chips: ["Call", "Text", "Email", "WhatsApp", "Website", "LinkedIn", "Booking", "Save Contact", "Share Profile"],
    chipsEs: ["Llamar", "Mensaje", "Correo", "WhatsApp", "Sitio web", "LinkedIn", "Reservas", "Guardar contacto", "Compartir perfil"],
    secondaryHref: "/hardware",
  },
  {
    key: "share",
    title: "Share", titleEs: "Compartir",
    tagline: "Send one tap to any destination you choose.",
    taglineEs: "Envía un toque a donde tú elijas.",
    color: "aqua",
    headline: "One tap. Anywhere you choose.",
    headlineEs: "Un toque. Adonde tú elijas.",
    description: "A SnapLink can point to your SOLO profile, a website, a portfolio, or any destination you set — and you can change it anytime.",
    descriptionEs: "Un SnapLink puede apuntar a tu perfil SOLO, un sitio web, un portafolio o cualquier destino que elijas — y puedes cambiarlo cuando quieras.",
    chips: ["SOLO profile", "Website", "Portfolio", "Social destination", "Custom destination"],
    chipsEs: ["Perfil SOLO", "Sitio web", "Portafolio", "Destino social", "Destino personalizado"],
    secondaryHref: "/hardware",
  },
  {
    key: "protect",
    title: "Protect", titleEs: "Proteger",
    tagline: "Help someone reach the right person when it matters.",
    taglineEs: "Ayuda a que alguien contacte a la persona correcta cuando importa.",
    color: "green",
    headline: "Help someone reach the right person when it matters.",
    headlineEs: "Ayuda a que alguien contacte a la persona correcta cuando importa.",
    description: "A SnapLink on a bag, keys, or something you carry gives a stranger a safe, direct way to reach you.",
    descriptionEs: "Un SnapLink en una bolsa, llaves o algo que llevas contigo le da a un extraño una forma segura y directa de contactarte.",
    chips: ["Belongings", "Bags", "Keys", "Personal contact", "Guardian contact"],
    chipsEs: ["Pertenencias", "Bolsas", "Llaves", "Contacto personal", "Contacto del tutor"],
    secondaryHref: "/hardware",
  },
  {
    key: "kids",
    title: "Kids", titleEs: "Niños",
    tagline: "A safer SnapLink experience for backpacks, bracelets and belongings.",
    taglineEs: "Una experiencia SnapLink más segura para mochilas, brazaletes y pertenencias.",
    color: "yellow",
    headline: "A little SnapLink for the people you care about most.",
    headlineEs: "Un pequeño SnapLink para quienes más te importan.",
    description: "A tap opens a guardian-approved Kids profile with safe, guardian-controlled contact options — never a full name, address, or private details.",
    descriptionEs: "Un toque abre un perfil Kids aprobado por el tutor con opciones de contacto seguras y controladas — nunca nombre completo, dirección ni datos privados.",
    chips: ["Call Guardian", "Text Guardian", "WhatsApp Guardian", "Alternate guardian", "Safe help message"],
    chipsEs: ["Llamar al tutor", "Mensaje al tutor", "WhatsApp al tutor", "Tutor alterno", "Mensaje de ayuda seguro"],
    secondaryHref: "/kids",
    privacyPoints: [
      { t: "First name only", tEs: "Solo el nombre", b: "Never a full name, address, or school.", bEs: "Nunca nombre completo, dirección ni escuela." },
      { t: "Guardian contact", tEs: "Contacto del tutor", b: "One tap to call — the number isn't on the page.", bEs: "Un toque para llamar — el número no está en la página." },
      { t: "Private by design", tEs: "Privado por diseño", b: "No search engines, unguessable link.", bEs: "Sin buscadores, con enlace no adivinable." },
    ],
    characterTeaser: ["Snap Dino", "Snap Dragon", "Snap Gator", "Snap Mouse", "Snap Giraffe", "Snap Kitty", "Snap Hippo"],
  },
];

export const purposes: Purpose[] = demoPurposeContent.map((p) => ({ ...p, ...purposeStructure[p.key] }));

/** Merges CMS-editable content rows with code-defined structural matching logic. */
export function purposesFromRows(rows: PurposeOption[]): Purpose[] {
  return rows.filter((row) => row.active).map((row) => {
    const key = row.key as PurposeKey;
    const privacyPoints = row.privacyPointsEn && row.privacyPointsEs
      ? row.privacyPointsEn.map((point, i) => ({
          t: point.t, b: point.b,
          tEs: row.privacyPointsEs![i]?.t ?? point.t, bEs: row.privacyPointsEs![i]?.b ?? point.b,
        }))
      : undefined;
    return {
      key,
      title: row.titleEn, titleEs: row.titleEs,
      tagline: row.taglineEn, taglineEs: row.taglineEs,
      color: row.color,
      headline: row.headlineEn, headlineEs: row.headlineEs,
      description: row.descriptionEn, descriptionEs: row.descriptionEs,
      chips: row.chipsEn, chipsEs: row.chipsEs,
      secondaryHref: row.secondaryHref,
      privacyPoints,
      characterTeaser: row.characterTeaser ?? undefined,
      ...purposeStructure[key],
    };
  });
}

export function recommendedProducts(purpose: Purpose, products: HomeProduct[]): HomeProduct[] {
  const matched = products.filter((p) => purpose.types.some((type) => p.profileTypes.includes(type)));
  const rank = (slug: string) => { const i = purpose.preferredSlugs.indexOf(slug); return i === -1 ? purpose.preferredSlugs.length : i; };
  return [...matched].sort((a, b) => rank(a.slug) - rank(b.slug)).slice(0, 3);
}

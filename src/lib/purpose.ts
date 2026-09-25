import type { HomeProduct } from "@/components/home-experiences";
import type { PurposeOption } from "@/db/schema";

export type PurposeKey = "personal" | "sports" | "stage" | "creator" | "professional" | "share" | "protect" | "kids";

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
  /** Operator-uploaded card image; falls back to the top recommended product photo. */
  image?: { url: string; alt: string; objectPosition: string } | null;
  example?: { href: string; label: string; labelEs: string } | null;
  start?: { href: string; label: string; labelEs: string } | null;
};

/**
 * Structural hardware-matching logic — NOT CMS-editable. A typo here
 * silently breaks recommendations rather than just looking wrong, so it
 * stays code-reviewed. Everything else about a purpose (copy, color,
 * on/off) is CMS-editable via purpose_options — see purposesFromRows().
 */
const purposeStructure: Record<PurposeKey, { types: string[]; preferredSlugs: string[] }> = {
  personal: { types: ["personal"], preferredSlugs: ["phone-tag", "nfc-card", "keychain"] },
  sports: { types: ["personal", "creator"], preferredSlugs: ["bracelet", "keychain", "phone-tag", "nfc-card"] },
  stage: { types: ["personal", "creator"], preferredSlugs: ["nfc-card", "phone-tag", "keychain"] },
  creator: { types: ["creator"], preferredSlugs: ["nfc-card", "phone-tag", "keychain"] },
  professional: { types: ["professional", "business"], preferredSlugs: ["networking-kit", "nfc-card", "phone-tag", "table-stand"] },
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
    key: "sports",
    title: "SnapTrack", titleEs: "SnapTrack",
    tagline: "For athletes & cheer — your reel, stats and milestones, one tap for coaches and recruiters.",
    taglineEs: "Para atletas y animación — tu video, estadísticas y logros, un toque para entrenadores y reclutadores.",
    color: "gold",
    headline: "Your journey. Your record. One tap.",
    headlineEs: "Tu camino. Tu historial. Un toque.",
    description: "SnapTrack keeps your highlight reel, stats and milestones in one place — you update them all season as you grow. One tap puts it all in front of coaches and recruiters, with a clear contact button (a coach or guardian for minors).",
    descriptionEs: "SnapTrack reúne tu video destacado, tus estadísticas y tus logros en un solo lugar — tú los actualizas toda la temporada a medida que creces. Un toque lo pone frente a entrenadores y reclutadores, con un botón de contacto claro (entrenador o tutor para menores).",
    chips: ["Highlight reel", "Stats & results", "Recruiting contact", "Guardian contact", "Cheer & dance", "English & Spanish"],
    chipsEs: ["Video destacado", "Estadísticas y logros", "Contacto de reclutamiento", "Contacto del tutor", "Animación y danza", "Español e inglés"],
    secondaryHref: "/hardware",
    example: { href: "/examples/athlete", label: "See a SnapTrack example", labelEs: "Ver un ejemplo de SnapTrack" },
    start: { href: "/get-started?path=athlete", label: "Start your SnapTrack", labelEs: "Empieza tu SnapTrack" },
  },
  {
    key: "stage",
    title: "Performing arts", titleEs: "Artes escénicas",
    tagline: "Reel, credits and talent sheet for auditions and agents.",
    taglineEs: "Reel, créditos y ficha de talento para audiciones y agentes.",
    color: "pink",
    headline: "Your reel, one tap from the casting table.",
    headlineEs: "Tu reel, a un toque de la mesa de casting.",
    description: "Actors and dancers share a Talent Profile with a featured reel, portfolio, credits and a talent sheet — routed to you, your agent or your manager.",
    descriptionEs: "Actores y bailarines comparten un Perfil de Talento con reel destacado, portafolio, créditos y ficha de talento — dirigido a ti, tu agente o tu mánager.",
    chips: ["Reel", "Portfolio", "Credits", "Training", "Talent sheet", "Agent contact"],
    chipsEs: ["Reel", "Portafolio", "Créditos", "Formación", "Ficha de talento", "Contacto de agente"],
    secondaryHref: "/hardware",
    example: { href: "/examples/actor", label: "See an actor example", labelEs: "Ver ejemplo de actor" },
    start: { href: "/get-started?path=actor", label: "Create your Talent Profile", labelEs: "Crea tu Perfil de Talento" },
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
    example: { href: "/examples/combined", label: "See a multi-talent example", labelEs: "Ver ejemplo multitalento" },
    start: { href: "/get-started?path=creator", label: "Create yours", labelEs: "Crea el tuyo" },
  },
  {
    key: "professional",
    title: "Professional", titleEs: "Profesional",
    tagline: "Nurses, realtors, consultants — credentials, resume and easy follow-up.",
    taglineEs: "Enfermería, bienes raíces, consultores — credenciales, currículum y seguimiento fácil.",
    color: "blue",
    headline: "Meet. Tap. Scan. Follow up.",
    headlineEs: "Conoce. Toca. Escanea. Da seguimiento.",
    description: "Share your contact details, booking link and work in one tap. Scan the business cards you receive and keep every introduction in one place — with the SnapLink Networking Kit. No monthly fee.",
    descriptionEs: "Comparte tu contacto, enlace de reservas y trabajo en un toque. Escanea las tarjetas de presentación que recibas y mantén cada introducción en un solo lugar — con el Kit de Networking SnapLink. Sin cuota mensual.",
    chips: ["Call", "Text", "Email", "WhatsApp", "Website", "LinkedIn", "Booking", "Save Contact", "Share Profile", "Business Card Scanner", "Professional Resume"],
    chipsEs: ["Llamar", "Mensaje", "Correo", "WhatsApp", "Sitio web", "LinkedIn", "Reservas", "Guardar contacto", "Compartir perfil", "Escáner de tarjetas", "Currículum profesional"],
    secondaryHref: "/hardware",
    example: { href: "/examples/nurse", label: "See a nurse example", labelEs: "Ver ejemplo de enfermería" },
    start: { href: "/get-started?path=professional", label: "Build your resume", labelEs: "Crea tu currículum" },
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

/** Default CMS rows for any purpose missing from purpose_options (operator page seeds these). */
export function defaultPurposeRows() {
  return demoPurposeContent.map((p, sortOrder) => ({
    id: `purpose_${p.key}`, key: p.key, sortOrder, active: true,
    titleEn: p.title, titleEs: p.titleEs, taglineEn: p.tagline, taglineEs: p.taglineEs,
    headlineEn: p.headline, headlineEs: p.headlineEs, descriptionEn: p.description, descriptionEs: p.descriptionEs,
    chipsEn: p.chips, chipsEs: p.chipsEs, color: p.color, secondaryHref: p.secondaryHref,
    privacyPointsEn: p.privacyPoints?.map(({ t, b }) => ({ t, b })) ?? null,
    privacyPointsEs: p.privacyPoints?.map(({ tEs, bEs }) => ({ t: tEs, b: bEs })) ?? null,
    characterTeaser: p.characterTeaser ?? null,
    exampleHref: p.example?.href ?? null, exampleLabelEn: p.example?.label ?? null, exampleLabelEs: p.example?.labelEs ?? null,
    startHref: p.start?.href ?? null, startLabelEn: p.start?.label ?? null, startLabelEs: p.start?.labelEs ?? null,
  }));
}

/** Merges CMS-editable content rows with code-defined structural matching logic. */
type PurposeRow = PurposeOption & { image?: { url: string; alt: string | null; objectPosition: string } | null };
const action = (href: string | null, en: string | null, es: string | null) => href ? { href, label: en || es || href, labelEs: es || en || href } : null;

export function purposesFromRows(rows: PurposeRow[]): Purpose[] {
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
      image: row.image ? { url: row.image.url, alt: row.image.alt ?? "", objectPosition: row.image.objectPosition } : null,
      example: action(row.exampleHref, row.exampleLabelEn, row.exampleLabelEs),
      start: action(row.startHref, row.startLabelEn, row.startLabelEs),
      ...purposeStructure[key],
    };
  });
}

/** CMS rows win; any purpose key with no row yet (e.g. newly added) falls back to its default. */
export function purposesWithDefaults(rows: PurposeRow[]): Purpose[] {
  const present = new Set(rows.map((row) => row.key));
  const fromRows = purposesFromRows(rows).map((purpose) => ({ purpose, order: rows.find((row) => row.key === purpose.key)!.sortOrder }));
  const missing = purposes.map((purpose, order) => ({ purpose, order })).filter(({ purpose }) => !present.has(purpose.key));
  return [...fromRows, ...missing].sort((a, b) => a.order - b.order).map(({ purpose }) => purpose);
}

export function recommendedProducts(purpose: Purpose, products: HomeProduct[]): HomeProduct[] {
  const matched = products.filter((p) => purpose.types.some((type) => p.profileTypes.includes(type)));
  const rank = (slug: string) => { const i = purpose.preferredSlugs.indexOf(slug); return i === -1 ? purpose.preferredSlugs.length : i; };
  return [...matched].sort((a, b) => rank(a.slug) - rank(b.slug)).slice(0, 3);
}

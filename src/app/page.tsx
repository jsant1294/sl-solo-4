import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui";
import { Section, Eyebrow, Glyph, PhoneFrame } from "@/components/primitives";
import { ProductMedia } from "@/components/product-media";
import { PersonalizationMoment, PurposeFinder, StyleDiscovery, TapDemo, VideoRail, type HomeProduct } from "@/components/home-experiences";
import { ProfileRenderer } from "@/components/renderers";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { purposes as demoPurposes, purposesFromRows } from "@/lib/purpose";
import { collections as demoCollections, collectionsFromRows } from "@/lib/collections";
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return { title: `SnapLink SOLO — ${t.home.heroTitle}`, description: t.home.heroSub,
    openGraph: { title: t.home.heroTitle, description: t.home.heroSub }, twitter: { card: "summary_large_image", title: t.home.heroTitle, description: t.home.heroSub } };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams); const t = getDict(locale); const L = (href: string) => withLang(href, locale); const H = (href: string) => href.startsWith("/") ? L(href) : href;
  const secureCheckoutBody = process.env.VERCEL_ENV === "production"
    ? t.home.trust.secureBodyProd
    : t.home.trust.secureBodyPreview;
  // purpose_options is a new table (migration 0006, not yet applied everywhere) —
  // fall back to demo content if the query fails so this never breaks the
  // homepage during the window between deploying this code and running the
  // migration. Once applied, this behaves exactly like every other CMS table.
  const [products, cmsRows, purposeRows, collectionRows] = await Promise.all([
    data.products(true), data.storefrontSections(),
    db ? repo.purposes.list().catch(() => null) : Promise.resolve(null),
    db ? repo.collections.list().catch(() => null) : Promise.resolve(null),
  ]);
  const purposeList = purposeRows && purposeRows.length ? purposesFromRows(purposeRows) : demoPurposes;
  const collectionList = collectionRows && collectionRows.length ? collectionsFromRows(collectionRows) : demoCollections;
  const view = products.map((product): HomeProduct => {
    const rich = product as typeof product & { primaryImage?: { url: string; alt: string | null; objectPosition: string } | null; video?: { id: string; url: string } | null; videoPoster?: { url: string } | null };
    return { id: product.id, slug: product.slug, name: locale === "es" ? product.nameEs ?? product.name : product.name, price: dollars(product.basePrice), productType: product.productType, colors: product.colors, profileTypes: product.profileTypesSupported, personalization: product.personalizationOptions, image: rich.primaryImage ? { url: rich.primaryImage.url, alt: rich.primaryImage.alt ?? product.name, objectPosition: rich.primaryImage.objectPosition } : null, video: rich.video ?? null, poster: rich.videoPoster?.url ?? null };
  });
  const C = (key: string, defaults: CmsDefaults) => cmsCopy(cmsRows, key, locale, defaults);
  const heroCms = C("hero", { eyebrow: "SL / Solo", headline: t.home.heroTitle, body: t.home.heroSub, ctaLabel: t.home.ctaPrimary, ctaHref: "/hardware" });
  const seeTapCms = C("see_tap", { eyebrow: "See the tap.", headline: "Watch one tap change the moment.", body: "Real product demonstrations uploaded through Product Studio.", ctaLabel: "See the hardware", ctaHref: "/hardware/nfc-card" });
  const purposeCms = C("purpose", { eyebrow: locale === "es" ? "Encuentra el ideal" : "Find your fit", headline: locale === "es" ? "¿Qué hará tu SnapLink?" : "What will your SnapLink do?", body: "" });
  const collectionsCms = C("collections", { eyebrow: locale === "es" ? "Encuentra tu estilo" : "Find your look", headline: locale === "es" ? "Hecho para tu personalidad." : "Made for your personality.", body: locale === "es" ? "Desde acabados emblemáticos hasta personajes divertidos, elige un SnapLink que se sienta tuyo." : "From signature finishes to playful characters, choose a SnapLink that feels like yours." });
  const hardwareCms = C("hardware", { eyebrow: "Choose your SnapLink", headline: "Hardware made for the moment.", body: "", ctaLabel: "Shop all hardware", ctaHref: "/hardware" });
  const personalizationCms = C("personalization", { eyebrow: "Make it yours.", headline: "Choose the details that fit you.", body: "Choose hardware, style, color or design, and what happens after the tap.", ctaLabel: "Customize", ctaHref: "/hardware/nfc-card" });
  const profileCms = C("profile_demo", { eyebrow: "Profile demo", headline: "This is what opens after the tap.", body: "Your real SOLO profile—contact actions, links, and everything you choose to share.", ctaLabel: "Open the live profile", ctaHref: "/u/jose" });
  const howCms = C("how_it_works", { eyebrow: t.how.title, headline: locale === "es" ? "Del pago a cada toque después." : "From checkout to every tap after.", body: t.home.processBody });
  const trustCms = C("trust", { eyebrow: "Built for everyday connection", headline: "Simple to use. Easy to keep current.", body: "No app required. Secure checkout. Update anytime." });
  const compareCms = C("compare", {
    eyebrow: locale === "es" ? "Por qué SnapLink" : "Why SnapLink",
    headline: locale === "es" ? "Hecho para durar, no para facturarte cada mes." : "Built to last, not to bill you every month.",
    body: "",
  });
  const businessCms = C("business", { eyebrow: locale === "es" ? "¿Tienes un negocio?" : "Run a business?", headline: locale === "es" ? "También creamos un SnapLink para eso." : "We built a SnapLink for that, too.", body: locale === "es" ? "Convierte cada toque en más que un contacto: conecta clientes con tu negocio, servicios, reseñas, campañas y más." : "Turn every tap into more than a contact—connect customers to your business, services, reviews, campaigns and more.", ctaLabel: locale === "es" ? "Explorar SnapLink para Negocios" : "Explore SnapLink for Business", ctaHref: "https://snaplink.southlineone.com" });
  const finalCms = C("final_cta", { eyebrow: locale === "es" ? "Un toque. Hazlo tuyo." : "One tap. Make it yours.", headline: locale === "es" ? "Hay un SnapLink que se parece a ti." : "There’s a SnapLink that looks like you.", body: locale === "es" ? "Elige tu hardware, encuentra tu estilo y decide qué pasa después del toque." : "Choose your hardware, find your style, and decide what happens after the tap.", ctaLabel: locale === "es" ? "Elige tu SnapLink" : "Choose your SnapLink", ctaHref: "/hardware" });
  const defaultHero = view[products.findIndex((product) => product.featured)] ?? view[0];
  const heroBase = view.find((product) => product.id === heroCms.featuredProductId) ?? defaultHero;
  const hero = withCmsMedia(heroBase, heroCms.media);
  const seeTapBase = view.find((product) => product.id === seeTapCms.featuredProductId) ?? hero;
  const seeTapProduct = withCmsMedia(seeTapBase, seeTapCms.media);
  const personalized = view.find((product) => product.id === personalizationCms.featuredProductId) ?? view.find((product) => product.personalization.length > 0) ?? view.find((_, index) => products[index]?.personalizationAvailable) ?? view[0];
  const personalizedProduct = withCmsMedia(personalized, personalizationCms.media);
  const hardwareProducts = [...products]
    .sort((a, b) => Number(b.id === hardwareCms.featuredProductId) - Number(a.id === hardwareCms.featuredProductId))
    .map((product) => product.id === hardwareCms.featuredProductId && hardwareCms.media ? { ...product, cmsMedia: hardwareCms.media } : product);
  const profileDemo = await data.profileByUsername("jose");

  return <><SiteHeader locale={locale}/><CmsThemeStyles sections={[heroCms, seeTapCms, purposeCms, collectionsCms, hardwareCms, personalizationCms, profileCms, howCms, trustCms, compareCms, businessCms, finalCms]}/>
    {heroCms.active && <Section className="relative flex min-h-[78vh] items-center overflow-hidden py-24 sm:min-h-[88vh] sm:py-28">
      <HeroBackdrop media={heroCms.media} mobileMedia={heroCms.mobileMedia} fallback={hero} desktopPosition={heroCms.desktopPosition} mobilePosition={heroCms.mobilePosition}/>
      <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(100deg,rgba(10,8,6,${(heroCms.overlayStrength / 100).toFixed(2)}) 0%,rgba(10,8,6,${((heroCms.overlayStrength / 100) * 0.55).toFixed(2)}) 45%,rgba(10,8,6,${((heroCms.overlayStrength / 100) * 0.1).toFixed(2)}) 100%)` }}/>
      <div className="relative max-w-xl rise">
        <Eyebrow>{heroCms.eyebrow}</Eyebrow>
        <h1 className="font-display font-semibold text-5xl sm:text-6xl leading-[0.98] tracking-tight mt-4 text-white">{heroCms.headline}</h1>
        {heroCms.body && <p className="text-lg text-white/80 mt-6 max-w-lg leading-relaxed">{heroCms.body}</p>}
        <div className="flex flex-wrap gap-3 mt-8 items-center">
          {heroCms.ctaLabel && heroCms.ctaHref && <Button href={H(heroCms.ctaHref)} size="lg" className="!bg-gold !text-[#171512] hover:!bg-[hsl(var(--gold-bright))]">{heroCms.ctaLabel}<Glyph.arrow className="w-4 h-4"/></Button>}
          <Button href={L("/#explore")} size="lg" variant="outline" className="!border-white/40 !text-white hover:!border-gold hover:!text-gold">{t.home.seeItWork}</Button>
        </div>
        <p className="font-mono text-xs text-white/60 mt-5">{t.home.heroLine}</p>
      </div>
    </Section>}

    {seeTapCms.active && <Section id="explore" className="py-16 sm:py-20 bg-ink text-bg"><div className="flex items-end justify-between gap-6 mb-8"><div><Eyebrow>{seeTapCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl sm:text-5xl mt-3">{seeTapCms.headline}</h2></div>{seeTapCms.body && <p className="hidden md:block max-w-xs text-sm text-white/55">{seeTapCms.body}</p>}</div><div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16"><VideoRail products={seeTapProduct ? [seeTapProduct] : view} ctaLabel={seeTapCms.ctaLabel} ctaHref={seeTapCms.ctaHref} locale={locale}/><div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-8 lg:gap-10 lg:flex-1 lg:py-2"><Proof n="01" title={t.home.proof.tapTitle} body={t.home.proof.tapBody}/><Proof n="02" title={t.home.proof.openTitle} body={t.home.proof.openBody}/><Proof n="03" title={t.home.proof.updateTitle} body={t.home.proof.updateBody}/></div></div></Section>}

    {purposeCms.active && <Section className="py-12 sm:py-24 bg-[linear-gradient(135deg,hsl(var(--coral)/.08),hsl(var(--violet)/.06),hsl(var(--aqua)/.08))]"><Eyebrow>{purposeCms.eyebrow}</Eyebrow><h2 className="font-display text-3xl sm:text-5xl mt-3">{purposeCms.headline}</h2>{purposeCms.body && <p className="mt-3 sm:mt-4 max-w-xl text-ink-soft">{purposeCms.body}</p>}<CmsMediaAccent media={purposeCms.media}/><div className="mt-6 sm:mt-9"><PurposeFinder products={view} purposes={purposeList} locale={locale}/></div></Section>}

    {collectionsCms.active && <Section className="py-16 sm:py-24 overflow-hidden bg-[linear-gradient(180deg,hsl(var(--bg)),hsl(var(--bg-sunken)))]"><div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-9"><div><Eyebrow>{collectionsCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl sm:text-5xl mt-3">{collectionsCms.headline}</h2></div><div className="flex flex-col items-start sm:items-end gap-3">{collectionsCms.body && <p className="max-w-md text-sm text-ink-soft">{collectionsCms.body}</p>}{collectionsCms.ctaLabel && collectionsCms.ctaHref && <Link href={H(collectionsCms.ctaHref)} className="hidden sm:inline-flex text-sm text-ink no-underline">{collectionsCms.ctaLabel} →</Link>}</div></div><CmsMediaAccent media={collectionsCms.media}/><StyleDiscovery products={view} collections={collectionList} locale={locale} featuredCollection={collectionsCms.featuredCollection}/></Section>}

    {hardwareCms.active && <Section className="py-16 sm:py-20 border-y border-line bg-[linear-gradient(180deg,hsl(var(--bg)),hsl(var(--blue)/.055))]"><div className="flex items-end justify-between gap-6 mb-9"><div><Eyebrow>{hardwareCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl mt-3">{hardwareCms.headline}</h2>{hardwareCms.body && <p className="mt-3 max-w-xl text-sm text-ink-soft">{hardwareCms.body}</p>}</div>{hardwareCms.ctaLabel && hardwareCms.ctaHref && <Link href={H(hardwareCms.ctaHref)} className="hidden sm:inline-flex text-sm text-ink no-underline">{hardwareCms.ctaLabel} →</Link>}</div><div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">{hardwareProducts.map((product, index) => <Link key={product.id} href={L(`/hardware/${product.slug}`)} className={`group overflow-hidden border border-line bg-bg-raised no-underline transition-all hover:border-gold/60 hover:-translate-y-1 ${index % 3 === 0 ? "rounded-t-[2rem]" : "rounded-xl"}`}><div className={`relative ${index % 3 === 0 ? "aspect-[4/5]" : "aspect-square"}`}><ProductMedia product={product}/><span className="pointer-events-none absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-bg-raised/90 text-ink shadow-sm backdrop-blur transition-transform group-hover:scale-110"><Glyph.tap className="h-4 w-4"/></span></div><div className="p-4 sm:p-5"><p className="text-[0.62rem] uppercase tracking-[0.16em] text-gold mb-1.5">{productIntent(product.profileTypesSupported, t)}</p><div className="sm:flex sm:items-baseline sm:justify-between gap-2"><h3 className="font-display text-lg sm:text-xl text-ink">{locale === "es" ? product.nameEs ?? product.name : product.name}</h3><span className="font-mono text-xs sm:text-sm text-gold">{dollars(product.basePrice)}</span></div><p className="hidden sm:block text-sm text-ink-faint mt-2">{locale === "es" ? product.shortDescriptionEs ?? product.shortDescription : product.shortDescription}</p><span className="inline-flex items-center gap-1 text-xs text-ink-soft mt-3 transition-transform group-hover:translate-x-1">{t.home.chooseThisSnapLink}<Glyph.arrow className="h-3 w-3"/></span></div></Link>)}</div>{hardwareCms.ctaLabel && hardwareCms.ctaHref && <Button href={H(hardwareCms.ctaHref)} variant="outline" className="sm:hidden mt-6 w-full">{hardwareCms.ctaLabel}</Button>}</Section>}

    {personalizationCms.active && personalizedProduct && <Section className="py-16 sm:py-24 bg-[linear-gradient(135deg,hsl(var(--yellow)/.10),hsl(var(--pink)/.07),hsl(var(--bg)))]"><PersonalizationMoment product={personalizedProduct} locale={locale} eyebrow={personalizationCms.eyebrow} headline={personalizationCms.headline} body={personalizationCms.body} ctaLabel={personalizationCms.ctaLabel} ctaHref={personalizationCms.ctaHref ? H(personalizationCms.ctaHref) : null}/></Section>}

    {profileCms.active && <Section id="tap-demo" className="py-16 sm:py-20 border-y border-line"><div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-10 items-center"><div><Eyebrow>{profileCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl sm:text-5xl mt-3">{profileCms.headline}</h2>{profileCms.body && <p className="text-ink-soft mt-5">{profileCms.body}</p>}<CmsMediaAccent media={profileCms.media}/>{profileCms.ctaLabel && profileCms.ctaHref && <Button href={H(profileCms.ctaHref)} variant="outline" className="mt-7">{profileCms.ctaLabel} →</Button>}</div>{profileDemo ? <PhoneFrame><ProfileRenderer profile={profileDemo} links={profileDemo.links} locale={profileDemo.locale}/></PhoneFrame> : hero ? <TapDemo product={hero} locale={locale}/> : null}</div></Section>}

    {howCms.active && <Section className="py-16 sm:py-20"><div className="mb-9"><Eyebrow>{howCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl mt-3">{howCms.headline}</h2>{howCms.body && <p className="mt-4 text-ink-soft">{howCms.body}</p>}<CmsMediaAccent media={howCms.media}/></div><div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none]">{t.home.processSteps.map((step, index) => <Step key={step.n} n={step.n} title={step.t} body={step.b} pattern={STEP_PATTERNS[index % STEP_PATTERNS.length]}/>)}</div></Section>}

    {trustCms.active && <Section className="py-12 sm:py-16 bg-bg-sunken"><div className="mb-8"><Eyebrow>{trustCms.eyebrow}</Eyebrow><h2 className="font-display text-3xl mt-2">{trustCms.headline}</h2>{trustCms.body && <p className="mt-3 text-sm text-ink-soft">{trustCms.body}</p>}<CmsMediaAccent media={trustCms.media}/></div><div className="grid sm:grid-cols-3 gap-8"><Trust title={t.home.trust.noAppTitle} body={t.home.trust.noAppBody}/><Trust title={t.home.trust.secureTitle} body={secureCheckoutBody}/><Trust title={t.home.trust.updateTitle} body={t.home.trust.updateBody}/></div></Section>}

    {compareCms.active && <Section className="py-16 sm:py-20 border-y border-line"><div className="mb-9 max-w-xl"><Eyebrow>{compareCms.eyebrow}</Eyebrow><h2 className="font-display text-3xl sm:text-4xl mt-3">{compareCms.headline}</h2><CmsMediaAccent media={compareCms.media}/></div>
      <div className="grid sm:grid-cols-3 gap-6">
        <Trust
          title={locale === "es" ? "$0 al mes, siempre" : "$0 a month, always"}
          body={locale === "es" ? "Pagas tu SnapLink una sola vez. Sin plan Pro, sin suscripción para mantener tu perfil activo." : "You pay for your SnapLink once. No Pro plan, no subscription to keep your profile live."}
        />
        <Trust
          title={locale === "es" ? "Captura de contactos incluida" : "Contact capture, included"}
          body={locale === "es" ? "Cualquiera puede dejarte su información desde tu perfil — no es una función de pago." : "Anyone can leave you their info right from your profile — it's not locked behind a paid tier."}
        />
        <Trust
          title={locale === "es" ? "Sin comisión sobre lo que ganas" : "No cut of what you earn"}
          body={locale === "es" ? "Tus enlaces de pago van directo a ti. No tomamos porcentaje de tus ventas o propinas." : "Your payment links go straight to you. We never take a percentage of your sales or tips."}
        />
      </div>
    </Section>}

    {businessCms.active && <Section className="py-16 sm:py-24 bg-ink text-bg">{businessCms.eyebrow && <p className="text-center font-display font-semibold text-4xl sm:text-7xl text-gold mb-10 sm:mb-14">{businessCms.eyebrow}</p>}<div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end"><div><h2 className="font-display text-4xl sm:text-5xl">{businessCms.headline}</h2>{businessCms.body && <p className="mt-5 max-w-2xl text-bg/65">{businessCms.body}</p>}<CmsMediaAccent media={businessCms.media}/><p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-gold">SnapLink Business · Get found. Build trust. Grow.</p></div>{businessCms.ctaLabel && businessCms.ctaHref && <a href={businessCms.ctaHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold/60 px-6 py-3 text-sm text-gold no-underline transition-colors hover:bg-gold hover:text-bg">{businessCms.ctaLabel} →</a>}</div></Section>}

    {finalCms.active && <Section className="relative overflow-hidden py-16 sm:py-24 text-center border-t border-line"><div className="absolute inset-0 opacity-[0.12] pattern-color"/><div className="relative mx-auto max-w-3xl rounded-[2rem] border border-line bg-bg/90 px-6 py-12 sm:px-12 sm:py-16 shadow-lg backdrop-blur"><div className="mb-7 flex justify-center -space-x-2"><span className="h-10 w-10 rounded-full border-4 border-bg bg-[#14120f]"/><span className="h-10 w-10 rounded-full border-4 border-bg bg-[#e86fa6]"/><span className="h-10 w-10 rounded-full border-4 border-bg bg-[#416db3]"/><span className="h-10 w-10 rounded-full border-4 border-bg bg-[#397d52]"/><span className="h-10 w-10 rounded-full border-4 border-bg bg-[#b78a32]"/></div><Eyebrow>{finalCms.eyebrow}</Eyebrow><h2 className="font-display text-4xl sm:text-5xl font-semibold max-w-2xl mx-auto mt-4 leading-tight">{finalCms.headline}</h2>{finalCms.body && <p className="mx-auto mt-5 max-w-xl text-ink-soft">{finalCms.body}</p>}<div className="flex justify-center"><CmsMediaAccent media={finalCms.media}/></div>{finalCms.ctaLabel && finalCms.ctaHref && <div className="mt-9"><Button href={H(finalCms.ctaHref)} size="lg">{finalCms.ctaLabel}<Glyph.arrow className="w-4 h-4"/></Button></div>}</div></Section>}
    <SiteFooter locale={locale}/>
  </>;
}

function Proof({ n, title, body }: { n: string; title: string; body: string }) { return <div className="border-t border-white/15 pt-5"><p className="font-mono text-xs text-gold">{n}</p><p className="font-display text-2xl mt-3">{title}</p><p className="text-sm text-white/55 mt-2 max-w-xs">{body}</p></div>; }
const STEP_PATTERNS = ["pattern-signature", "pattern-color", "pattern-play", "pattern-kids"];
function Step({ n, title, body, pattern }: { n: string; title: string; body: string; pattern: string }) {
  return <div className="min-w-[62vw] sm:min-w-[210px] max-w-[240px] shrink-0 snap-center overflow-hidden rounded-2xl border border-line bg-bg-raised">
    <div className={`relative aspect-[4/5] ${pattern}`}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent"/>
      <p className="absolute left-4 top-4 font-mono text-xs text-white/80">{n}</p>
      <p className="absolute inset-x-0 bottom-0 p-4 font-display text-2xl text-white">{title}</p>
    </div>
    <p className="p-4 text-sm text-ink-soft">{body}</p>
  </div>;
}
function Trust({ title, body }: { title: string; body: string }) { return <div><p className="font-display text-2xl">{title}</p><p className="text-sm text-ink-soft mt-2 max-w-sm">{body}</p></div>; }
function productIntent(types: string[], t: ReturnType<typeof getDict>) { if (types.includes("kids")) return t.home.purpose.protect; if (types.includes("creator")) return t.home.purpose.creatorShare; if (types.includes("professional") || types.includes("business")) return t.home.purpose.professional; return t.home.purpose.personal; }

type CmsDefaults = { eyebrow?: string; headline: string; body?: string; ctaLabel?: string; ctaHref?: string };
type StorefrontRows = Awaited<ReturnType<typeof data.storefrontSections>>;
type CmsMedia = StorefrontRows[number]["media"];

function cmsCopy(rows: StorefrontRows, key: string, locale: "en" | "es", defaults: CmsDefaults) {
  const row = rows.find((item) => item.key === key);
  return {
    active: row?.active ?? true,
    eyebrow: (locale === "es" ? row?.eyebrowEs : row?.eyebrowEn) ?? defaults.eyebrow ?? "",
    headline: (locale === "es" ? row?.headlineEs : row?.headlineEn) ?? defaults.headline,
    body: (locale === "es" ? row?.bodyEs : row?.bodyEn) ?? defaults.body ?? "",
    ctaLabel: (locale === "es" ? row?.ctaLabelEs : row?.ctaLabelEn) ?? defaults.ctaLabel ?? null,
    ctaHref: row?.ctaHref ?? defaults.ctaHref ?? null,
    media: row?.media ?? null,
    mobileMedia: row?.mobileMedia ?? null,
    backgroundTheme: row?.backgroundTheme ?? "ivory",
    overlayStrength: row?.overlayStrength ?? 62,
    desktopPosition: row?.desktopPosition ?? "50% 50%",
    mobilePosition: row?.mobilePosition ?? "65% 50%",
    featuredProductId: row?.featuredProductId ?? null,
    featuredCollection: row?.featuredCollection ?? null,
  };
}

function withCmsMedia(product: HomeProduct | undefined, media: CmsMedia): HomeProduct | undefined {
  if (!product || !media) return product;
  if (media.kind === "video") return { ...product, video: { id: media.id, url: media.url } };
  return { ...product, image: { url: media.url, alt: media.alt ?? product.name, objectPosition: media.objectPosition } };
}

function CmsMediaAccent({ media }: { media: CmsMedia }) {
  if (!media) return null;
  return <div className="my-6 max-w-[260px] overflow-hidden rounded-xl border border-line bg-bg-raised shadow-sm">{media.kind === "video"
    ? <video src={media.url} controls muted playsInline preload="metadata" className="aspect-video w-full object-cover"/>
    : <img src={media.url} alt={media.alt ?? ""} loading="lazy" className="aspect-video w-full object-cover" style={{ objectPosition: media.objectPosition }}/>}</div>;
}

function HeroBackdrop({ media, mobileMedia, fallback, desktopPosition, mobilePosition }: { media: CmsMedia; mobileMedia: CmsMedia; fallback?: HomeProduct; desktopPosition: string; mobilePosition: string }) {
  const desktop = media ?? (fallback?.video ? { kind: "video", url: fallback.video.url } : fallback?.image ? { kind: "image", url: fallback.image.url, alt: fallback.image.alt } : null);
  const mobile = mobileMedia ?? desktop;
  return <div className="absolute inset-0"><div className="hidden h-full md:block"><BackgroundAsset media={desktop} position={desktopPosition}/></div><div className="h-full md:hidden"><BackgroundAsset media={mobile} position={mobilePosition}/></div></div>;
}

function BackgroundAsset({ media, position }: { media: { kind: string; url: string; alt?: string | null } | null; position: string }) {
  if (!media) return <div className="h-full bg-[linear-gradient(135deg,#16120e,#6f5428)]"/>;
  if (media.kind === "video") return <video src={media.url} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover" style={{ objectPosition: position }}/>
  return <img src={media.url} alt={media.alt ?? ""} aria-hidden loading="eager" className="h-full w-full object-cover" style={{ objectPosition: position }}/>;
}

function CmsThemeStyles({ sections }: { sections: Array<{ active: boolean; backgroundTheme: string }> }) {
  const css = sections.filter((section) => section.active).map((section, index) => {
    const background = themeBackground(section.backgroundTheme);
    const selector = `body > section:nth-of-type(${index + 1})`;
    return `${selector}{background:${background}!important}${section.backgroundTheme === "charcoal" ? `${selector}{color:#f8f6f1}${selector} .text-ink-soft,${selector} .text-ink-faint{color:rgba(248,246,241,.68)!important}` : ""}`;
  }).join("");
  return <style dangerouslySetInnerHTML={{ __html: css }}/>;
}

function themeBackground(theme: string) {
  const themes: Record<string, string> = {
    ivory: "#f8f6f1", sand: "#eadbc5", coral: "#efd1c7", lavender: "#ded8ec",
    aqua: "#d4e8e5", sage: "#dce5d6", yellow: "#f3e6b7", charcoal: "#171512",
    pattern: "radial-gradient(circle at 20% 20%,rgba(183,138,50,.24) 0 2px,transparent 3px),linear-gradient(135deg,#f1d9ce,#d9d4ea,#cfe6df)",
  };
  return themes[theme] ?? themes.ivory;
}

"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { withLang } from "@/i18n/util";
import { Glyph, PhoneFrame } from "@/components/primitives";
import { Sheet } from "@/components/ui";
import { recommendedProducts, type Purpose } from "@/lib/purpose";
import type { Collection } from "@/lib/collections";

export type HomeProduct = {
  id: string; slug: string; name: string; price: string; productType: string;
  colors: string[]; profileTypes: string[]; personalization: string[];
  image: { url: string; alt: string; objectPosition: string } | null;
  video: { id: string; url: string } | null; poster: string | null;
};

const emit = (type: string, product: HomeProduct) => fetch("/api/commerce-event", {
  method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
  body: JSON.stringify({ type, productId: product.id, mediaId: product.video?.id }),
}).catch(() => undefined);

const emitPurpose = (type: string, payload: { purpose: string; productId?: string; locale: string }) => fetch("/api/commerce-event", {
  method: "POST", headers: { "content-type": "application/json" }, keepalive: true,
  body: JSON.stringify({ type, ...payload }),
}).catch(() => undefined);

export function HeroProductStage({ product }: { product: HomeProduct }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => setReduceMotion(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return <div className="relative aspect-[4/5] max-w-[460px] mx-auto overflow-hidden rounded-2xl border border-line bg-bg-sunken shadow-lg">
    {product.video && !reduceMotion ? <video ref={video} src={product.video.url} poster={product.poster ?? product.image?.url} autoPlay muted={muted} loop playsInline preload="metadata" className="h-full w-full object-cover" onPlay={() => emit("video_start", product)}/>
      : product.image ? <img src={product.image.url} alt={product.image.alt} className="h-full w-full object-cover" style={{ objectPosition: product.image.objectPosition }}/>
      : <FallbackShape type={product.productType}/>}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5 pt-24 text-white">
      <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/70">SnapLink Solo</p>
      <div className="mt-1 flex items-end justify-between gap-4"><div><p className="font-display text-2xl">{product.name}</p><p className="text-sm text-white/70">From {product.price}</p></div><Link href={`/hardware/${product.slug}`} onClick={() => emit("video_cta_click", product)} className="text-sm text-white no-underline">Shop this SnapLink →</Link></div>
    </div>
    {product.video && !reduceMotion && <button onClick={() => { const next = !muted; setMuted(next); if (video.current) video.current.muted = next; }} className="absolute right-3 top-3 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs text-white backdrop-blur" aria-label={muted ? "Turn sound on" : "Mute video"}>{muted ? "Sound on" : "Mute"}</button>}
  </div>;
}

export function VideoRail({ products, ctaLabel, ctaHref, locale = "en" }: { products: HomeProduct[]; ctaLabel?: string | null; ctaHref?: string | null; locale?: "en" | "es" }) {
  const videos = products.filter((p) => p.video);
  if (!videos.length) return null;
  return <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none]">
    {videos.map((product, index) => <VideoRailCard key={product.id} product={product} index={index} ctaLabel={ctaLabel} ctaHref={ctaHref} locale={locale}/>)}
  </div>;
}

function VideoRailCard({ product, index, ctaLabel, ctaHref, locale }: { product: HomeProduct; index: number; ctaLabel?: string | null; ctaHref?: string | null; locale: "en" | "es" }) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => setReduceMotion(matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    if (video.current) { video.current.muted = next; if (!next) video.current.play(); }
  };
  return <article className="relative mx-auto min-w-[78vw] sm:min-w-[300px] max-w-[330px] snap-center overflow-hidden rounded-xl bg-black aspect-[9/16]">
    <video ref={video} src={product.video!.url} poster={product.poster ?? product.image?.url ?? undefined} autoPlay={!reduceMotion} muted={muted} loop playsInline preload="metadata" className="h-full w-full object-cover" onPlay={() => emit("video_start", product)} onEnded={() => emit("video_complete", product)}/>
    <button onClick={toggleSound} className="absolute inset-0" aria-label={muted ? (locale === "es" ? `Tocar para activar sonido en ${product.name}` : `Tap for sound on ${product.name}`) : (locale === "es" ? "Silenciar" : "Mute")}/>
    <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/30 bg-black/35 px-3 py-1.5 text-xs text-white backdrop-blur">{muted ? (locale === "es" ? "Toca el sonido" : "Tap for sound") : (locale === "es" ? "Silenciar" : "Mute")}</span>
    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 pt-24 text-white"><p className="text-[0.65rem] uppercase tracking-[0.18em] text-white/65">{useCaseTitle(product, index, locale)}</p><p className="font-display text-2xl mt-1">{product.name}</p><Link href={ctaHref || `/hardware/${product.slug}`} onClick={() => emit("video_cta_click", product)} className="pointer-events-auto mt-4 inline-flex text-sm text-white no-underline">{ctaLabel || (locale === "es" ? "Ver el hardware" : "See the hardware")} →</Link></div>
  </article>;
}

export function PurposeFinder({ products, purposes, locale = "en" }: { products: HomeProduct[]; purposes: Purpose[]; locale?: "en" | "es" }) {
  const [openKey, setOpenKey] = useState<Purpose["key"] | null>(null);
  const [activeKey, setActiveKey] = useState<Purpose["key"] | null>(null);
  const L = useMemo(() => (href: string) => withLang(href, locale), [locale]);

  useEffect(() => { purposes.forEach((p) => emitPurpose("purpose_view", { purpose: p.key, locale })); }, [locale]);

  const select = (purpose: Purpose) => {
    setOpenKey(purpose.key);
    setActiveKey(purpose.key);
    emitPurpose("purpose_selected", { purpose: purpose.key, locale });
    emitPurpose("purpose_modal_open", { purpose: purpose.key, locale });
  };
  const close = () => setOpenKey(null);

  const active = purposes.find((p) => p.key === openKey) ?? null;
  const recommended = active ? recommendedProducts(active, products) : [];

  return <>
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
      {purposes.map((purpose, index) => <PurposeCard key={purpose.key} purpose={purpose} thumbnail={recommendedProducts(purpose, products)[0]} locale={locale} selected={activeKey === purpose.key} priority={index < 4} onSelect={() => select(purpose)}/>)}
    </div>
    {active && <Sheet open={!!openKey} onClose={close} labelledBy={`purpose-${active.key}-title`} accent={active.color}>
      <PurposeModalContent purpose={active} products={recommended} locale={locale} onClose={close} L={L}/>
    </Sheet>}
  </>;
}

/** Image-first purpose card. Operator image (Purpose CMS) → top matched product photo → color field. */
function PurposeCard({ purpose, thumbnail, locale, selected, priority, onSelect }: { purpose: Purpose; thumbnail?: HomeProduct; locale: "en" | "es"; selected: boolean; priority: boolean; onSelect: () => void }) {
  const image = purpose.image ?? (thumbnail?.image ? { url: thumbnail.image.url, alt: "", objectPosition: thumbnail.image.objectPosition } : null);
  const tint = `hsl(var(--${purpose.color}))`;
  return <button
    onClick={onSelect} aria-haspopup="dialog"
    className={`group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl text-left shadow-sm ring-1 transition-all hover:-translate-y-1 hover:shadow-md sm:aspect-[3/4] ${selected ? "ring-2" : "ring-line"}`}
    style={{ background: `linear-gradient(160deg, hsl(var(--${purpose.color}) / .55), hsl(var(--${purpose.color}) / .15))`, ...(selected ? { ["--tw-ring-color" as string]: tint } : {}) }}
  >
    {image && <img src={image.url} alt={purpose.image ? image.alt : ""} aria-hidden={!purpose.image} loading={priority ? "eager" : "lazy"} className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ objectPosition: image.objectPosition }}/>}
    {!purpose.image && image && <span className="absolute inset-0 -z-10 mix-blend-multiply" style={{ background: `hsl(var(--${purpose.color}) / .35)` }}/>}
    <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-transparent"/>
    <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: tint }}/>
    {(purpose.start || purpose.example) && <span className="absolute right-2.5 top-3.5 rounded-full bg-black/35 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-white backdrop-blur sm:right-3.5 sm:top-4">{locale === "es" ? "Ver ejemplo" : "Example"}</span>}
    <span className="relative p-3.5 text-white sm:p-5">
      <span className="flex items-center justify-between gap-2"><span className="block font-display text-lg leading-tight sm:text-2xl">{locale === "es" ? purpose.titleEs : purpose.title}</span><Glyph.arrow className="h-4 w-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5"/></span>
      <span className="mt-1.5 line-clamp-3 block text-xs text-white/75 sm:text-sm">{locale === "es" ? purpose.taglineEs : purpose.tagline}</span>
    </span>
  </button>;
}

function PurposeModalContent({ purpose, products, locale, onClose, L }: { purpose: Purpose; products: HomeProduct[]; locale: "en" | "es"; onClose: () => void; L: (href: string) => string }) {
  const es = locale === "es";
  const primary = products[0];
  return <div className="p-6 sm:p-7">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id={`purpose-${purpose.key}-title`} className="font-mono text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: `hsl(var(--${purpose.color}))` }}>{es ? purpose.titleEs : purpose.title}</p>
        <h3 className="font-display text-2xl sm:text-3xl mt-2 leading-tight">{es ? purpose.headlineEs : purpose.headline}</h3>
      </div>
      <button onClick={onClose} aria-label={es ? "Cerrar" : "Close"} className="shrink-0 -mr-1 -mt-1 grid h-9 w-9 place-items-center rounded-full text-ink-faint transition-colors hover:bg-bg-sunken hover:text-ink">
        <Glyph.close className="w-4 h-4"/>
      </button>
    </div>
    <p className="mt-4 text-sm text-ink-soft leading-relaxed">{es ? purpose.descriptionEs : purpose.description}</p>

    {(purpose.start || purpose.example) && <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      {purpose.start && <Link href={L(purpose.start.href)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg no-underline hover:bg-gold">{es ? purpose.start.labelEs : purpose.start.label}<Glyph.arrow className="w-4 h-4"/></Link>}
      {purpose.example && <Link href={L(purpose.example.href)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3 text-sm text-ink no-underline hover:border-gold hover:text-gold">{es ? purpose.example.labelEs : purpose.example.label}</Link>}
    </div>}

    <div className="mt-6 flex flex-wrap gap-2">
      {(es ? purpose.chipsEs : purpose.chips).map((chip) => <span key={chip} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft">{chip}</span>)}
    </div>

    {purpose.privacyPoints && <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {purpose.privacyPoints.map((point) => <div key={point.t} className="border-t border-line-strong pt-3">
        <p className="text-sm font-medium">{es ? point.tEs : point.t}</p>
        <p className="text-xs text-ink-faint mt-1">{es ? point.bEs : point.b}</p>
      </div>)}
    </div>}

    {purpose.characterTeaser && <div className="mt-6 rounded-lg border border-dashed border-line bg-bg-sunken/60 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint">{es ? "Próximamente en la colección Kids" : "Coming soon to the Kids collection"}</p>
      <p className="mt-2 text-sm text-ink-soft">{purpose.characterTeaser.join(" · ")}</p>
    </div>}

    <div className="mt-7">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-faint mb-3">{es ? "Hardware recomendado" : "Recommended hardware"}</p>
      {products.length > 0 ? <div className="grid gap-3 sm:grid-cols-3">
        {products.map((product) => <Link
          key={product.id} href={L(`/hardware/${product.slug}`)}
          onClick={() => emitPurpose("purpose_product_clicked", { purpose: purpose.key, productId: product.id, locale })}
          className="group overflow-hidden rounded-lg border border-line bg-bg-raised no-underline transition-all hover:border-gold/60"
        >
          <div className="aspect-square bg-bg-sunken">{product.image ? <img src={product.image.url} alt={product.image.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: product.image.objectPosition }}/> : <FallbackShape type={product.productType}/>}</div>
          <div className="p-3"><p className="text-sm text-ink truncate">{product.name}</p><p className="font-mono text-xs text-gold mt-0.5">{product.price}</p></div>
        </Link>)}
      </div> : <p className="text-sm text-ink-faint">{es ? "Explora todo el hardware disponible." : "Browse all available hardware."}</p>}
    </div>

    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
      {primary && <Link
        href={L(`/hardware/${primary.slug}`)}
        onClick={() => emitPurpose("purpose_product_clicked", { purpose: purpose.key, productId: primary.id, locale })}
        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-medium text-bg no-underline hover:bg-gold"
      >{es ? `Elegir ${primary.name}` : `Choose ${primary.name}`}<Glyph.arrow className="w-4 h-4"/></Link>}
      <Link
        href={L(purpose.secondaryHref)}
        onClick={() => emitPurpose("purpose_all_hardware_clicked", { purpose: purpose.key, locale })}
        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-line-strong px-6 py-3 text-sm text-ink no-underline hover:border-gold hover:text-gold"
      >{es ? "Ver todo el hardware" : "See all hardware"}</Link>
    </div>
  </div>;
}

export function StyleDiscovery({ products, collections, locale, featuredCollection }: { products: HomeProduct[]; collections: Collection[]; locale: "en" | "es"; featuredCollection?: string | null }) {
  const orderedCollections = featuredCollection ? [...collections].sort((a, b) => Number(b.key === featuredCollection) - Number(a.key === featuredCollection)) : collections;
  return <div className="relative">
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 [-ms-overflow-style:none] [scrollbar-width:none]">
      {orderedCollections.map((collection, index) => {
        const product = collection.key === "kids" ? products.find((item) => item.profileTypes.includes("kids")) : products[index % products.length];
        const cardClass = "group block min-w-[82vw] max-w-[360px] sm:min-w-[320px] snap-center overflow-hidden rounded-2xl border border-line bg-bg-raised shadow-sm no-underline transition-all hover:border-gold/60 hover:-translate-y-1";
        const card = <>
          <div className={`relative aspect-[5/4] ${collection.pattern}`}>
            {collection.key === "signature" && product?.image && <img src={product.image.url} alt={product.image.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-75" style={{ objectPosition: product.image.objectPosition }}/>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent"/>
            <p className="absolute left-5 top-5 rounded-full border border-white/30 bg-black/25 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white backdrop-blur">{locale === "es" ? "Colección" : "Collection"}</p>
            {product && <span className="pointer-events-none absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition-transform group-hover:scale-110"><Glyph.tap className="h-4 w-4"/></span>}
            <div className="absolute inset-x-0 bottom-0 p-5 text-white"><h3 className="font-display text-3xl">{locale === "es" ? collection.titleEs : collection.title}</h3><p className="mt-1 text-sm text-white/70">{locale === "es" ? collection.noteEs : collection.note}</p></div>
          </div>
          <div className="flex items-center justify-between gap-4 p-5"><div className="flex -space-x-1">{collection.colors.map((color) => <span key={color} className="h-7 w-7 rounded-full border-2 border-bg-raised shadow-sm" style={{ background: color }}/>)}</div>{product && <span className="text-sm text-ink">{locale === "es" ? "Explorar" : "Explore"} →</span>}</div>
        </>;
        return product
          ? <Link key={collection.key} href={`/hardware/${product.slug}`} className={cardClass}>{card}</Link>
          : <div key={collection.key} className={cardClass}>{card}</div>;
      })}
    </div>
    <p className="mt-3 text-xs text-ink-faint">{locale === "es" ? "Las muestras representan direcciones de diseño disponibles; las fotos aparecen solo cuando hay medios reales." : "Swatches represent available design directions; product photography appears only where real media exists."}</p>
  </div>;
}

export function TapDemo({ product, locale = "en" }: { product: HomeProduct; locale?: "en" | "es" }) {
  const [stage, setStage] = useState(0); // 0 idle, 1 approach, 2 tap, 3 open, 4 connect
  const es = locale === "es";
  const stages = es ? ["Acercar", "Tocar", "Abrir", "Conectar"] : ["Approach", "Tap", "Open", "Connect"];
  const active = stage > 0;
  const trigger = () => {
    setStage(1);
    [650, 1300, 2000].forEach((ms, i) => window.setTimeout(() => setStage(i + 2), ms));
    window.setTimeout(() => setStage(0), 3000);
  };
  return <button onClick={trigger} className="group relative block w-full overflow-hidden rounded-2xl border border-line bg-bg-sunken text-left p-6 sm:p-10" aria-label={es ? "Demostrar un toque de SnapLink" : "Demonstrate a SnapLink tap"}>
    <div className="relative mx-auto w-[210px] sm:w-[240px]">
      <div className="pointer-events-none scale-[0.72] sm:scale-[0.8] origin-top">
        <PhoneFrame><div className="flex h-[440px] items-center justify-center bg-gradient-to-b from-bg-raised to-bg-sunken"><span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">{active ? (es ? "Listo" : "Ready") : (es ? "En espera" : "Waiting")}</span></div></PhoneFrame>
      </div>
      <div className="absolute right-4 top-[38%] h-2.5 w-2.5">
        <AnimatePresence>
          {stage === 2 && [0, 1].map((i) => (
            <motion.span key={i} className="absolute inset-0 rounded-full border border-gold"
              initial={{ scale: 1, opacity: 0.9 }} animate={{ scale: 8, opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.9, delay: i * 0.15, ease: "easeOut" }}/>
          ))}
        </AnimatePresence>
      </div>
      <motion.div
        className="absolute right-[-1.5rem] top-[38%] w-[92px] sm:w-[104px] aspect-[4/5] overflow-hidden rounded-xl border border-line-strong shadow-xl bg-bg-raised"
        initial={false}
        animate={active ? { x: 0, y: 0, rotate: -8, opacity: 1 } : { x: 90, y: 30, rotate: 18, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {product.image ? <img src={product.image.url} alt="" aria-hidden className="h-full w-full object-cover" style={{ objectPosition: product.image.objectPosition }}/> : <FallbackShape type={product.productType}/>}
      </motion.div>
    </div>
    <div className="mt-6 sm:mt-8 flex justify-center gap-4 sm:gap-6 text-xs sm:text-sm">
      {stages.map((label, i) => <span key={label} className={stage === i + 1 ? "text-ink font-medium" : "text-ink-faint"}>{label}</span>)}
    </div>
    <p className="mt-3 text-center text-xs text-ink-faint">{active ? (es ? "Perfil abierto." : "Profile opened.") : (es ? "Toca para ver cómo funciona." : "Tap to see how it works.")}</p>
  </button>;
}

export function PersonalizationMoment({ product, locale = "en", eyebrow, headline, body, ctaLabel, ctaHref }: { product: HomeProduct; locale?: "en" | "es"; eyebrow?: string; headline?: string; body?: string; ctaLabel?: string | null; ctaHref?: string | null }) {
  const [color, setColor] = useState(product.colors[0] ?? "Obsidian");
  const wash = swatchColor(color);
  return <motion.div
    className="grid lg:grid-cols-2 gap-8 items-center rounded-2xl border bg-bg-raised p-6 sm:p-10 shadow-sm"
    animate={{ borderColor: `${wash}55`, boxShadow: `0 12px 32px -16px ${wash}55` }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <div className="relative aspect-square overflow-hidden rounded-xl bg-bg-sunken">{product.video ? <video src={product.video.url} poster={product.poster ?? product.image?.url ?? undefined} controls muted playsInline preload="metadata" className="h-full w-full object-cover"/> : product.image ? <img src={product.image.url} alt={product.image.alt} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: product.image.objectPosition }}/> : <FallbackShape type={product.productType}/>}<div className="absolute left-4 top-4 rounded-full bg-bg-raised/90 px-3 py-1 text-xs text-ink shadow-sm backdrop-blur">{color}</div>{product.video && <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-bg-raised/90 px-3 py-1.5 text-xs text-ink shadow-sm backdrop-blur"><Glyph.tap className="h-3.5 w-3.5"/>{locale === "es" ? "Reproducir" : "Play"}</div>}</div>
    <div><p className="text-xs uppercase tracking-[0.2em] text-gold">{eyebrow || (locale === "es" ? "Hazlo tuyo." : "Make it yours.")}</p><h3 className="font-display text-3xl mt-3">{headline || (locale === "es" ? "Elige los detalles que van contigo." : "Choose the details that fit you.")}</h3>{body && <p className="mt-4 text-sm text-ink-soft">{body}</p>}{product.colors.length > 0 && <div className="mt-7"><p className="text-xs text-ink-faint">Color · {color}</p><div className="flex flex-wrap gap-2 mt-3">{product.colors.map((item) => <motion.button key={item} whileTap={{ scale: 0.92 }} onClick={() => setColor(item)} className={`flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm ${color === item ? "border-gold text-gold shadow-sm" : "border-line"}`}><span className="h-5 w-5 rounded-full border border-black/10" style={{ background: swatchColor(item) }}/>{item}</motion.button>)}</div></div>}{product.personalization.length > 0 && <div className="mt-7"><p className="text-xs text-ink-faint">{locale === "es" ? "Personalización disponible" : "Available personalization"}</p><p className="mt-2 text-sm">{product.personalization.join(" · ")}</p></div>}<div className="mt-7 grid grid-cols-2 gap-2 text-xs">{[["1", locale === "es" ? "Hardware" : "Hardware"], ["2", locale === "es" ? "Estilo" : "Style"], ["3", locale === "es" ? "Color/diseño" : "Color/design"], ["4", locale === "es" ? "Destino" : "Tap destination"]].map(([n, label]) => <Link key={n} href={ctaHref || `/hardware/${product.slug}`} className="rounded-lg border border-line p-3 text-ink-soft no-underline transition-colors hover:border-gold hover:text-gold">{n} · {label}</Link>)}</div><p className="mt-7 text-sm text-ink-soft">{locale === "es" ? "Elige adónde va cada toque. Actualiza tu perfil SOLO cuando quieras." : "Choose where every tap goes. Update your SOLO profile anytime."}</p>{ctaLabel && <Link href={ctaHref || `/hardware/${product.slug}`} className="inline-flex items-center gap-1 mt-6 text-sm text-ink no-underline">{ctaLabel}<Glyph.arrow className="h-3.5 w-3.5"/></Link>}</div>
  </motion.div>;
}

function swatchColor(name: string) { const value = name.toLowerCase(); if (value.includes("pink")) return "#e86fa6"; if (value.includes("blue")) return "#416db3"; if (value.includes("green")) return "#397d52"; if (value.includes("gold")) return "#b78a32"; if (value.includes("ivory") || value.includes("cream")) return "#f3ead5"; if (value.includes("purple")) return "#7352a2"; return "#14120f"; }

function useCaseTitle(product: HomeProduct, index: number, locale: "en" | "es" = "en") {
  const type = product.profileTypes[0];
  if (locale === "es") return type === "creator" ? "Toca para compartir" : type === "professional" || type === "business" ? "Toca para que te encuentren" : type === "kids" ? "Toca para ayudar" : index % 2 ? "Toca para recordar" : "Toca para conectar";
  return type === "creator" ? "Tap to share" : type === "professional" || type === "business" ? "Tap to get found" : type === "kids" ? "Tap to help" : index % 2 ? "Tap to remember" : "Tap to connect";
}
function FallbackShape({ type }: { type: string }) { return <div className="h-full w-full grid place-items-center bg-[radial-gradient(circle_at_65%_25%,hsl(var(--gold)/.18),transparent_38%),linear-gradient(145deg,hsl(var(--bg-sunken)),hsl(var(--bg)))]"><div className={type === "bracelet" ? "h-36 w-36 rounded-full border-[16px] border-ink shadow-lg" : "h-28 w-44 rounded-xl bg-ink shadow-lg"}/></div>; }

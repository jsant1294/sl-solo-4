import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section, Eyebrow, Glyph } from "@/components/primitives";
import { ProductShot } from "@/components/product-shot";
import { ProductMedia } from "@/components/product-media";
import { CommerceBeacon } from "@/components/commerce-beacon";
import { AddToCart } from "./add-to-cart";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const locale = localeFrom(await searchParams);
  const p = await data.productBySlug(slug);
  if (!p || !p.active) return { title: "SnapLink SOLO" };
  const name = locale === "es" ? p.nameEs ?? p.name : p.name;
  const description = (locale === "es" ? p.shortDescriptionEs ?? p.shortDescription : p.shortDescription) ?? undefined;
  return { title: `${name} — SnapLink SOLO`, description, openGraph: { title: name, description } };
}

export default async function ProductDetail({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const p = await data.productBySlug(slug);
  if (!p || !p.active) notFound();

  return (
    <>
      <CommerceBeacon type="product_view" productId={p.id}/>
      <SiteHeader locale={locale} />
      <Section className="pt-10 pb-24">
        <Link href={L("/hardware")} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-gold no-underline mb-8">
          <Glyph.arrow className="w-4 h-4 rotate-180" />{t.hardware.backToStore}
        </Link>
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="rounded-2xl border border-line aspect-square overflow-hidden sticky top-24">
            <ProductMedia product={p} />
          </div>
          <div>
            <Eyebrow>SL / Solo</Eyebrow>
            <h1 className="font-display text-4xl font-semibold tracking-tight mt-3">{locale === "es" ? p.nameEs ?? p.name : p.name}</h1>
            <p className="text-lg text-ink-soft mt-3">{locale === "es" ? p.shortDescriptionEs ?? p.shortDescription : p.shortDescription}</p>
            <p className="font-mono text-2xl text-gold mt-6">{dollars(p.basePrice)}</p>
            {(locale === "es" ? p.fullDescriptionEs ?? p.fullDescription : p.fullDescription) && <p className="text-ink-soft mt-6 leading-relaxed">{locale === "es" ? p.fullDescriptionEs ?? p.fullDescription : p.fullDescription}</p>}

            <div className="mt-8">
              <AddToCart product={{ id: p.id, basePrice: p.basePrice, personalizationAvailable: p.personalizationAvailable,
                customArtAvailable: p.customArtAvailable, customArtPriceCents: p.customArtPriceCents,
                variants: p.variants.map((v) => ({ id: v.id, label: v.label, color: v.color, priceDelta: v.priceDelta })) }}
                locale={locale} labels={{ add: t.hardware.buy, personalize: locale === "es" ? "Personalización" : "Personalization",
                  color: locale === "es" ? "Color" : "Color", added: locale === "es" ? "Agregado" : "Added", viewCart: locale === "es" ? "Ver carrito" : "View cart",
                  customArt: locale === "es" ? "Diseño de arte personalizado (Touchpoint Art)" : "Custom Touchpoint Art design",
                  customArtNotes: locale === "es" ? "Describe tu diseño o pega un enlace de referencia" : "Describe your design or paste a reference link",
                  customArtUpload: locale === "es" ? "Subir imagen de referencia" : "Upload reference image",
                  customArtUploading: locale === "es" ? "Subiendo…" : "Uploading…",
                  customArtUploaded: locale === "es" ? "Imagen subida ✓ — cambiar" : "Image uploaded ✓ — change",
                  customArtUploadError: locale === "es" ? "No se pudo subir. Intenta de nuevo." : "Upload failed. Try again." }} />
            </div>

            {p.activationInstructions && (
              <div className="mt-10 pt-5 border-t border-line">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold mb-1.5">{locale === "es" ? "Activación" : "Activation"}</p>
                <p className="text-ink-soft text-sm">{p.activationInstructions}</p>
              </div>
            )}
          </div>
        </div>
      </Section>
      <SiteFooter locale={locale} />
    </>
  );
}

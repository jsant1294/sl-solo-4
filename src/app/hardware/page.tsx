import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section, Eyebrow, Glyph } from "@/components/primitives";
import { ProductShot } from "@/components/product-shot";
import { ProductMedia } from "@/components/product-media";
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return { title: `${t.hardware.title} — SnapLink SOLO`, description: t.hardware.sub,
    openGraph: { title: t.hardware.title, description: t.hardware.sub } };
}

export default async function HardwareStore({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const products = await data.products(true);

  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-16 pb-10">
        <Eyebrow>SL / Solo</Eyebrow>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-4">{t.hardware.title}</h1>
        <p className="text-ink-soft mt-4 max-w-prose text-lg">{t.hardware.sub}</p>
      </Section>
      <Section className="pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <Link key={p.id} href={L(`/hardware/${p.slug}`)}
              className="group rounded-xl border border-line bg-bg-raised overflow-hidden no-underline hover:border-gold/50 hover:shadow-md transition-all duration-[var(--dur)] ease-editorial">
              <div className="aspect-square border-b border-line">
                <ProductMedia product={p} />
              </div>
              <div className="p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl font-medium text-ink">{locale === "es" ? p.nameEs ?? p.name : p.name}</h2>
                  <span className="font-mono text-sm text-gold">{dollars(p.basePrice)}</span>
                </div>
                <p className="text-ink-soft text-sm mt-2">{locale === "es" ? p.shortDescriptionEs ?? p.shortDescription : p.shortDescription}</p>
                <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft group-hover:text-gold mt-5 transition-colors">
                  {t.hardware.buy}<Glyph.arrow className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>
      <SiteFooter locale={locale} />
    </>
  );
}

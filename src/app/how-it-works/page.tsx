import type { Metadata } from "next";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Button } from "@/components/ui";
import { Section, Eyebrow, Glyph } from "@/components/primitives";
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return { title: `${t.how.title} — SnapLink SOLO`, description: t.how.sub,
    openGraph: { title: t.how.title, description: t.how.sub } };
}

export default async function HowItWorks({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);

  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-16 pb-10">
        <Eyebrow>SL / Solo</Eyebrow>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-4">{t.how.title}</h1>
        <p className="text-lg text-ink-soft mt-4 max-w-prose">{t.how.sub}</p>
      </Section>

      <Section className="pb-16">
        <ol className="border-t border-line">
          {t.how.steps.map((s, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-8 border-b border-line items-start">
              <span className="font-mono text-sm text-gold pt-1">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-display text-2xl font-medium tracking-tight">{s.t}</h2>
                <p className="text-ink-soft mt-2 max-w-prose">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="pb-24">
        <div className="flex flex-wrap gap-3">
          <Button href={L("/hardware")} size="lg">{t.home.ctaPrimary}<Glyph.arrow className="w-4 h-4" /></Button>
          <Button href={L("/join")} size="lg" variant="outline">{t.nav.join}</Button>
        </div>
      </Section>
      <SiteFooter locale={locale} />
    </>
  );
}

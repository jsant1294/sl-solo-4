import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section, Eyebrow } from "@/components/primitives";
import { UpgradeBridge } from "@/components/upgrade-bridge";
export const dynamic = "force-dynamic";

export default async function UpgradePublic({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-16 pb-24">
        <Eyebrow>SL / Solo → SL / Business</Eyebrow>
        <h1 className="font-display text-4xl font-semibold tracking-tight mt-4 max-w-3xl">{t.upgrade.title}</h1>
        <p className="text-lg text-ink-soft mt-4 max-w-prose">{t.upgrade.sub}</p>
        <div className="mt-10"><UpgradeBridge locale={locale} /></div>
      </Section>
      <SiteFooter locale={locale} />
    </>
  );
}

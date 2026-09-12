import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { Eyebrow } from "@/components/primitives";
import { UpgradeBridge } from "@/components/upgrade-bridge";
export const dynamic = "force-dynamic";

export default async function UpgradeApp({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return (
    <div>
      <Eyebrow>SL / Solo → SL / Business</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-tight mt-3 max-w-2xl">{t.upgrade.title}</h1>
      <p className="text-ink-soft mt-3 max-w-prose">{t.upgrade.sub}</p>
      <div className="mt-8"><UpgradeBridge locale={locale} /></div>
    </div>
  );
}

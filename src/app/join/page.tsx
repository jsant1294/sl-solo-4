import { getDict } from "@/i18n/dict";
import { localeFrom } from "@/i18n/util";
import { SiteHeader } from "@/components/site-chrome";
import { Section } from "@/components/primitives";
import { JoinForm } from "./join-form";
export const dynamic = "force-dynamic";

export default async function Join({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-16 pb-24">
        <div className="max-w-md mx-auto">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-center">{t.join.title}</h1>
          <p className="text-ink-soft text-center mt-3">{t.join.sub}</p>
          <div className="mt-10">
            <JoinForm locale={locale} />
          </div>
        </div>
      </Section>
    </>
  );
}

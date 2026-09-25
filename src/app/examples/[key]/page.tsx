import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { withLang } from "@/i18n/util";
import { isSampleKey, loadSamples, sampleBrand, sampleLabel, sampleStartHref, sampleStory } from "@/lib/samples";
import { SamplePreview } from "@/components/sample-preview";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sample profiles · SnapLink", robots: { index: false, follow: false } };

export default async function Example({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { key } = await params; const locale = (await searchParams).lang === "es" ? "es" : "en"; const es = locale === "es";
  if (!isSampleKey(key)) notFound();
  const all = await loadSamples(locale, { includeHidden: true });
  const sample = all.find((item) => item.key === key)!;
  const tabs = all.filter((item) => item.active || item.key === key);
  const L = (href: string) => withLang(href, locale);
  return <>
    <nav aria-label={es ? "Ejemplos" : "Examples"} className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur text-ink">
      <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        <Link href={L("/")} className="shrink-0 pr-2 font-display text-lg text-ink no-underline">SnapLink</Link>
        {tabs.map((item) => <Link key={item.key} href={L(`/examples/${item.key}`)} aria-current={item.key === key ? "page" : undefined}
          className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm no-underline ${item.key === key ? "border-ink bg-ink text-bg" : "border-line-strong text-ink hover:border-gold"}`}>{sampleLabel(item.key, locale)}</Link>)}
        <Link href={`/examples/${key}?lang=${es ? "en" : "es"}`} className="ml-auto shrink-0 pl-2 text-sm text-ink-soft">{es ? "English" : "Español"}</Link>
      </div>
    </nav>
    <div className="bg-bg px-5 pt-6 text-center">{sampleBrand(sample.key) && <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold">{sampleBrand(sample.key)} · {es ? "Tu camino. Tu historial. Un toque." : "Your journey. Your record. One tap."}</p>}<p className="mx-auto max-w-2xl font-display text-lg italic text-ink-soft sm:text-xl">“{sampleStory(sample.key, locale)}”</p></div>
    <SamplePreview sample={sample} locale={locale}/>
    {/* Always-visible way forward: buy the hardware, or build this profile. */}
    <div className="sticky bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-3 text-ink backdrop-blur"><div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-ink-faint">{es ? "Ejemplo ficticio" : "Fictional example"} · <Link href={L("/#find-your-fit")} className="underline">{es ? "Todos los perfiles" : "All profile types"}</Link></span>
      <span className="flex gap-2">
        <Link href={L(sampleStartHref(sample.key))} className="rounded-full border border-line-strong px-4 py-2.5 text-sm text-ink no-underline hover:border-gold">{es ? "Crear el mío" : "Build mine"}</Link>
        <Link href={L("/hardware")} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg no-underline hover:bg-gold">{es ? "Consigue tu SnapLink" : "Get your SnapLink"} →</Link>
      </span>
    </div></div>
  </>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { localeFrom, withLang } from "@/i18n/util";
import { getSessionUserId, listMyProfiles } from "@/lib/auth";
import { disciplines, type Discipline } from "@/lib/talent/model";
import { talentLabels } from "@/lib/talent/labels";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Eyebrow } from "@/components/primitives";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Get started · SnapLink", robots: { index: false, follow: false } };

type Path = Discipline | "professional";
const isPath = (v: unknown): v is Path => v === "professional" || disciplines.includes(v as Discipline);

/**
 * One entry point for every "Create yours" CTA on the landing page. Handles the whole ladder so a
 * visitor never lands somewhere confusing: signed out → sign-in (and back here) → no profile →
 * create one (and back here) → one profile → straight into the right editor → several → choose.
 */
export default async function GetStarted({ searchParams }: { searchParams: Promise<{ path?: string; lang?: string }> }) {
  const sp = await searchParams; const locale = localeFrom(sp); const es = locale === "es";
  const path: Path = isPath(sp.path) ? sp.path : "athlete";
  const self = withLang(`/get-started?path=${path}`, locale);

  if (!(await getSessionUserId())) redirect(withLang(`/sign-in?next=${encodeURIComponent(self)}`, locale));
  const eligible = (await listMyProfiles()).filter((p) => p.type !== "kids");
  if (eligible.length === 0) redirect(withLang(`/app/create?next=${encodeURIComponent(self)}`, locale));

  const target = (id: string) => path === "professional" ? withLang("/app/resume", locale) : withLang(`/app/profiles/${id}/talent?discipline=${path}`, locale);
  if (path === "professional" || eligible.length === 1) redirect(target(eligible[0].id));

  return <><SiteHeader locale={locale}/>
    <main className="mx-auto max-w-xl px-5 py-16 sm:py-24">
      <Eyebrow>{talentLabels[locale][path]}</Eyebrow>
      <h1 className="font-display text-4xl mt-3">{es ? "¿Qué perfil quieres usar?" : "Which profile should we use?"}</h1>
      <p className="mt-3 text-ink-soft">{es ? "Tu perfil de talento vive dentro de uno de tus SnapLinks. Tu página actual sigue igual hasta que publiques." : "Your Talent Profile lives inside one of your SnapLinks. Your current page stays the same until you publish."}</p>
      <ul className="mt-8 space-y-3">
        {eligible.map((p) => <li key={p.id}><Link href={target(p.id)} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-bg-raised px-5 py-4 no-underline text-ink transition-colors hover:border-gold">
          <span><span className="block font-display text-xl">{p.displayName}</span><span className="block text-xs text-ink-faint mt-0.5">/u/{p.username} · {p.status === "active" ? (es ? "En línea" : "Live") : (es ? "Borrador" : "Draft")}</span></span>
          <span aria-hidden className="text-gold">→</span>
        </Link></li>)}
      </ul>
      <p className="mt-8 text-sm text-ink-soft">{es ? "¿Prefieres uno nuevo? " : "Want a separate one? "}<Link href={withLang(`/app/create?next=${encodeURIComponent(self)}`, locale)} className="underline underline-offset-4">{es ? "Crear un perfil nuevo" : "Create a new profile"}</Link></p>
    </main>
  <SiteFooter locale={locale}/></>;
}

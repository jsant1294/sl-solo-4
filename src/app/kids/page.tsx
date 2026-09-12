import Link from "next/link";
import type { Metadata } from "next";
import { getDict } from "@/i18n/dict";
import { localeFrom, withLang } from "@/i18n/util";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { Section, Eyebrow } from "@/components/primitives";
import { ProductShot } from "@/components/product-shot";
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lang?: string }> }): Promise<Metadata> {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  return { title: `SnapLink Kids — ${t.home.kidsTitle}`, description: t.home.kidsBody,
    openGraph: { title: t.home.kidsTitle, description: t.home.kidsBody } };
}

export default async function KidsLanding({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale = localeFrom(await searchParams);
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const es = locale === "es";
  const products = await data.kidsProducts();

  return (
    <>
      <SiteHeader locale={locale} />
      <Section className="pt-16 pb-16">
        <Eyebrow>SnapLink Kids</Eyebrow>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight mt-4 max-w-2xl">{t.home.kidsTitle}</h1>
        <p className="text-lg text-ink-soft mt-5 max-w-prose">{t.home.kidsBody}</p>
      </Section>
      <Section className="pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
          {[
            { t: es ? "Solo el nombre" : "First name only", b: es ? "Nunca nombre completo, dirección ni escuela." : "Never a full name, address, or school." },
            { t: es ? "Contacto del tutor" : "Guardian contact", b: es ? "Un toque para llamar — el número no está en la página." : "One tap to call — the number isn't on the page." },
            { t: es ? "Privado por diseño" : "Private by design", b: es ? "Sin buscadores, con enlace no adivinable." : "No search engines, unguessable link." },
            { t: es ? "Varios tutores, en orden" : "Multiple guardians, ranked", b: es ? "Mamá, papá, abuela — quien encuentre la etiqueta ve a quién llamar primero." : "Mom, dad, grandma — whoever finds the tag sees exactly who to call first." },
            { t: es ? "Info de emergencia, opcional" : "Emergency info, opt-in", b: es ? "Alergias o notas médicas, ocultas hasta que alguien las abra." : "Allergies or medical notes, collapsed until someone opens them." },
            { t: es ? "Foto opcional" : "Photo is optional", b: es ? "Un monograma por defecto — la foto solo si tú la activas." : "A monogram by default — a photo only if you turn it on." },
          ].map((c) => (
            <div key={c.t} className="border-t border-line-strong pt-4">
              <p className="font-display text-lg font-medium">{c.t}</p>
              <p className="text-sm text-ink-soft mt-1">{c.b}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section className="pb-16">
        <div className="max-w-3xl rounded-2xl border border-line bg-bg-raised p-8">
          <Eyebrow>{es ? "No es otro link en bio" : "Not another link-in-bio"}</Eyebrow>
          <p className="text-ink-soft mt-4 leading-relaxed">
            {es
              ? "Linktree y tarjetas NFC genéricas están hechas para creadores y redes de contactos — no para un niño. No ocultan un número de teléfono, no permiten varios tutores en orden, y no piensan en qué pasa si un extraño encuentra la etiqueta. SnapLink Kids se diseñó desde cero para ese momento: alguien encuentra a tu hijo y necesita saber, en segundos, a quién llamar — sin exponer nada más."
              : "Linktree and generic NFC cards are built for creators and networking — not for a child. They don't hide a phone number, don't support ranked guardians, and don't think about what happens if a stranger finds the tag. SnapLink Kids was built from the ground up for that exact moment: someone finds your child and needs to know, in seconds, who to call — without exposing anything else."}
          </p>
        </div>
      </Section>
      <Section className="pb-24">
        <h2 className="font-display text-2xl font-medium tracking-tight mb-6">{es ? "Productos Kids" : "Kids products"}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((p) => (
            <Link key={p.id} href={L(`/hardware/${p.slug}`)}
              className="group rounded-xl border border-line bg-bg-raised overflow-hidden no-underline hover:border-gold/50 hover:shadow-md transition-all">
              <div className="aspect-square border-b border-line"><ProductShot productType={p.productType} color="#E86FA6" /></div>
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-medium">{p.name}</h3>
                  <span className="font-mono text-sm text-gold">{dollars(p.basePrice)}</span>
                </div>
                <p className="text-sm text-ink-faint mt-1">{p.shortDescription}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>
      <SiteFooter locale={locale} />
    </>
  );
}

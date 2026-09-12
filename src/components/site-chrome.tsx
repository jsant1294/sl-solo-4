import Link from "next/link";
import type { Locale } from "@/i18n/dict";
import { getDict } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { Wordmark, Button, LocaleToggle, MobileNav } from "./ui";
import { SnapTrackTeaser } from "./snap-track-teaser";

export function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  const navLinks = [
    { href: L("/hardware"), label: t.nav.shop },
    { href: L("/how-it-works"), label: t.nav.how },
    { href: L("/#explore"), label: t.nav.explore },
    { href: L("/app"), label: t.nav.signin },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-md">
      <div className="relative mx-auto max-w-site px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Wordmark href={L("/")} locale={locale} />
        <nav className="hidden md:flex items-center gap-8 text-sm text-ink-soft">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-ink transition-colors no-underline">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <span className="hidden md:inline-flex"><LocaleToggle locale={locale} /></span>
          <Link href={L("/cart")} className="text-sm text-ink-soft hover:text-ink no-underline shrink-0" aria-label={t.nav.cart}>
            {t.nav.cart}
          </Link>
          <Button href={L("/hardware")} size="md" className="px-3 sm:px-5 shrink-0"><span className="sm:hidden">{t.nav.shop}</span><span className="hidden sm:inline">{t.nav.shopFull}</span></Button>
          <MobileNav locale={locale} links={navLinks} />
        </div>
      </div>
    </header>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] uppercase tracking-widest text-ink-faint mb-3">{title}</p>
      <nav className="flex flex-col gap-2 text-sm text-ink-soft">{children}</nav>
    </div>
  );
}

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const L = (h: string) => withLang(h, locale);
  return (
    <footer className="border-t border-line mt-20">
      <div className="mx-auto max-w-site px-5 sm:px-8 py-14 grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr] gap-10">
        <div>
          <Wordmark href={L("/")} locale={locale} />
        </div>
        <FooterColumn title={t.footer.solo}>
          <Link href={L("/hardware")} className="hover:text-ink no-underline">{t.nav.shop}</Link>
          <Link href={L("/how-it-works")} className="hover:text-ink no-underline">{t.nav.how}</Link>
          <Link href={L("/#explore")} className="hover:text-ink no-underline">{t.nav.explore}</Link>
          <Link href={L("/support")} className="hover:text-ink no-underline">Help</Link>
        </FooterColumn>
        <FooterColumn title={t.footer.customers}>
          <Link href={L("/app")} className="hover:text-ink no-underline">{t.footer.myAccount}</Link>
          <Link href={L("/app/create")} className="hover:text-ink no-underline">{t.footer.manageProfile}</Link>
          <Link href={L("/refunds")} className="hover:text-ink no-underline">Refunds</Link>
          <Link href={L("/shipping")} className="hover:text-ink no-underline">Shipping</Link>
        </FooterColumn>
      </div>
      <div className="mx-auto max-w-site px-5 sm:px-8 pb-10 flex flex-wrap items-center gap-x-6 gap-y-2">
        <p className="font-mono text-xs text-ink-faint">{t.footer.copyright}</p>
        <Link href={L("/privacy")} className="text-xs text-ink-faint hover:text-ink no-underline">Privacy</Link>
        <Link href={L("/terms")} className="text-xs text-ink-faint hover:text-ink no-underline">{t.footer.terms}</Link>
        <Link href="/operator" className="text-xs text-ink-faint/70 hover:text-ink-faint no-underline ml-auto">{t.footer.operatorLogin}</Link>
      </div>
      <SnapTrackTeaser locale={locale}/>
    </footer>
  );
}

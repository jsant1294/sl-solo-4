"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getDict, DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";

const items = (t: ReturnType<typeof getDict>, locale: Locale, showNetworking: boolean, showResume: boolean) => [
  { href: "/app", label: t.app.home, key: "home" },
  { href: "/app/profile", label: t.app.profile, key: "profile" },
  { href: "/app/hardware", label: t.app.hardware, key: "hardware" },
  { href: "/app/activity", label: t.app.activity, key: "activity" },
  { href: "/app/leads", label: "Leads", key: "leads" },
  ...(showNetworking ? [{ href: "/app/networking", label: locale === "es" ? "Conexiones" : "Networking", key: "networking" }] : []),
  ...(showResume ? [{ href: "/app/resume", label: locale === "es" ? "Currículum" : "Resume", key: "resume" }] : []),
  { href: "/app/upgrade", label: t.app.upgrade, key: "upgrade" },
];

export function AppNav({ showNetworking = false, showResume = false }: { showNetworking?: boolean; showResume?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const lang = params.get("lang");
  const locale: Locale = LOCALES.includes(lang as Locale) ? (lang as Locale) : DEFAULT_LOCALE;
  const t = getDict(locale);
  const nav = items(t, locale, showNetworking, showResume);

  const active = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop side rail */}
      <aside className="hidden sm:flex fixed left-0 top-0 h-full w-20 flex-col items-center py-6 border-r border-line bg-bg z-30">
        <Link href={withLang("/", locale)} className="mb-8 font-display font-black text-gold text-lg no-underline" aria-label="SnapLink Solo">S</Link>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((it) => (
            <Link key={it.key} href={withLang(it.href, locale)}
              className={`w-14 py-2.5 rounded-lg text-center text-[0.65rem] font-medium no-underline transition-colors ${
                active(it.href) ? "bg-bg-sunken text-gold" : "text-ink-faint hover:text-ink"}`}>
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-bg/95 backdrop-blur-md">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((it) => (
            <Link key={it.key} href={withLang(it.href, locale)}
              className={`py-3 text-center text-[0.62rem] font-medium no-underline transition-colors ${
                active(it.href) ? "text-gold" : "text-ink-faint"}`}>
              {it.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

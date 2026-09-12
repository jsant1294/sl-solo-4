import { DEFAULT_LOCALE, LOCALES, type Locale } from "./dict";

/** Read ?lang= from a server component's searchParams safely. */
export function localeFrom(searchParams?: { lang?: string }): Locale {
  const l = searchParams?.lang;
  return LOCALES.includes(l as Locale) ? (l as Locale) : DEFAULT_LOCALE;
}

/** Build an href that carries the current locale. */
export function withLang(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}lang=${locale}`;
}

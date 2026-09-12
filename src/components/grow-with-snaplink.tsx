import Link from "next/link";
import { getDict, type Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { Glyph } from "./primitives";

/**
 * "Grow with SnapLink" — the visual bridge from a Business SOLO identity into
 * the SL / Business ecosystem. Premium, restrained, one accent. Renders only
 * for business-type profiles (gate at the call site). Links to /app/upgrade.
 */
export function GrowWithSnapLink({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const es = locale === "es";

  return (
    <Link href={withLang("/app/upgrade", locale)}
      className="group block rounded-xl border border-line bg-bg-sunken p-6 no-underline transition-all duration-[var(--dur)] ease-editorial hover:border-gold/50 hover:shadow-md relative overflow-hidden">
      {/* subtle gold wash, top-right */}
      <div className="absolute inset-0 opacity-70 pointer-events-none"
        style={{ background: "radial-gradient(120% 120% at 90% 0%, hsl(var(--gold) / 0.14), transparent 55%)" }} />
      <div className="relative flex items-center gap-5">
        <div className="w-11 h-11 rounded-full border border-gold/40 text-gold grid place-items-center shrink-0">
          <Glyph.arrow className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-gold">
            SL / Solo → SL / Business
          </p>
          <p className="font-display text-lg font-medium text-ink mt-1">
            {es ? "Crece con SnapLink" : "Grow with SnapLink"}
          </p>
          <p className="text-sm text-ink-soft mt-0.5">
            {es
              ? "¿Manejas un negocio? Pon SnapLink a trabajar."
              : "Run a business? Put SnapLink to work."}
          </p>
        </div>
        <span className="text-ink-faint group-hover:text-gold transition-colors shrink-0 hidden sm:block">
          <Glyph.arrow className="w-5 h-5" />
        </span>
      </div>
    </Link>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { getDict, otherLocale } from "@/i18n/dict";
import { Glyph } from "./primitives";

/* — Wordmark — SL / Solo lockup — */
export function Wordmark({ href = "/", solo = true, locale = "en" }: { href?: string; solo?: boolean; locale?: Locale }) {
  const t = getDict(locale);
  return (
    <Link href={href} className="inline-flex items-baseline gap-2 no-underline group" aria-label={t.common.homeAria}>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">SnapLink</span>
      {solo && (
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-gold border border-gold/40 rounded-sm px-1.5 py-0.5 translate-y-[-1px]">
          Solo
        </span>
      )}
    </Link>
  );
}

/* — Button — one accent, three intents — */
type BtnProps = {
  children: React.ReactNode; href?: string; onClick?: () => void;
  variant?: "solid" | "outline" | "ghost"; size?: "md" | "lg";
  type?: "button" | "submit"; disabled?: boolean; className?: string;
};
export function Button({
  children, href, onClick, variant = "solid", size = "md",
  type = "button", disabled, className = "",
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all duration-[var(--dur)] ease-editorial disabled:opacity-40 disabled:pointer-events-none no-underline whitespace-nowrap";
  const sizes = { md: "text-sm px-5 py-2.5", lg: "text-base px-7 py-3.5" };
  const variants = {
    solid: "bg-ink text-bg hover:bg-gold hover:text-bg shadow-sm",
    outline: "border border-line-strong text-ink hover:border-gold hover:text-gold",
    ghost: "text-ink-soft hover:text-ink",
  };
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

/* — Locale toggle — preserves path, flips ?lang — */
export function LocaleToggle({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const next = otherLocale(locale);
  const t = getDict(locale);
  const label = next === "es" ? "ES" : "EN";
  const go = () => {
    const p = new URLSearchParams(params.toString());
    p.set("lang", next);
    router.push(`${pathname}?${p.toString()}`);
  };
  return (
    <button
      onClick={go}
      className="font-mono text-xs tracking-widest text-ink-soft hover:text-gold transition-colors px-2 py-1"
      aria-label={next === "es" ? t.common.switchToSpanish : t.common.switchToEnglish}
    >
      {label}
    </button>
  );
}

/* — Mobile nav — hamburger + slide-down panel; owns the ES/EN toggle below md — */
export function MobileNav({
  locale, links,
}: { locale: Locale; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const t = getDict(locale);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? t.common.closeMenu : t.common.openMenu}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-9 h-9 -mr-1.5 text-ink-soft hover:text-ink transition-colors"
      >
        {open ? <Glyph.close className="w-5 h-5" /> : <Glyph.menu className="w-5 h-5" />}
      </button>
      {open && (
        <div data-testid="mobile-nav-panel" className="absolute inset-x-0 top-16 z-40 border-b border-line bg-bg shadow-lg">
          <nav className="mx-auto max-w-site px-5 py-5 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="py-2.5 text-base text-ink-soft hover:text-ink no-underline"
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-line flex items-center justify-between">
              <span className="text-xs text-ink-faint">{t.common.language}</span>
              <LocaleToggle locale={locale} />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

/* — Sheet — bottom sheet on mobile, centered modal on desktop.
   Generic overlay primitive: no product/purpose knowledge. Handles
   backdrop click, Escape, a manual focus trap, focus restore, and
   body scroll lock so page position is preserved when it closes. */
export function Sheet({
  open, onClose, labelledBy, accent, children,
}: { open: boolean; onClose: () => void; labelledBy: string; accent?: string; children: React.ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) { setEntered(false); return; }
    previouslyFocused.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => { setEntered(true); panelRef.current?.focus(); });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} aria-hidden className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${entered ? "opacity-100" : "opacity-0"}`} />
      <div
        ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 sm:inset-0 sm:m-auto flex max-h-[85vh] sm:max-h-[80vh] w-full sm:w-[calc(100%-2rem)] sm:max-w-lg flex-col overflow-y-auto rounded-t-2xl border-t sm:rounded-2xl sm:border border-line bg-bg pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-lg outline-none transition-all duration-200 ${entered ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:scale-95"}`}
        style={accent ? { borderTopColor: `hsl(var(--${accent}))`, borderTopWidth: 3 } : undefined}
      >
        {children}
      </div>
    </div>
  );
}



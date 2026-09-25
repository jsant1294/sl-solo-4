"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { PhoneFrame } from "@/components/primitives";

export type GallerySample = { key: string; label: string; brand?: string | null; story: string; href: string; startHref: string; shopHref: string; content: ReactNode };

/**
 * Homepage phone demo with switchable sample profiles. Each sample leads with the moment someone
 * taps (the emotional hook), then the profile, then an immediate way to buy or build one.
 */
export function SampleGallery({ samples, locale }: { samples: GallerySample[]; locale: "en" | "es" }) {
  const [active, setActive] = useState(samples[0]?.key);
  const current = samples.find((sample) => sample.key === active) ?? samples[0];
  if (!current) return null;
  const es = locale === "es";
  return <div className="flex flex-col items-center gap-5">
    <div role="tablist" aria-label={es ? "Perfiles de ejemplo" : "Sample profiles"} className="-mx-5 flex max-w-[100vw] gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
      {samples.map((sample) => <button key={sample.key} role="tab" type="button" aria-selected={sample.key === current.key} aria-controls="sample-phone" onClick={() => setActive(sample.key)}
        className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${sample.key === current.key ? "border-ink bg-ink text-bg" : "border-line-strong bg-bg-raised text-ink hover:border-gold hover:text-gold"}`}>{sample.label}</button>)}
    </div>
    <div key={`story-${current.key}`} aria-live="polite" className="rise min-h-[5.5rem] max-w-md text-center">
      {current.brand && <p className="mb-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold">{current.brand}</p>}
      <p className="font-display text-lg italic leading-snug text-ink-soft sm:text-xl">“{current.story}”</p>
    </div>
    <div id="sample-phone" role="tabpanel" aria-label={current.label}><PhoneFrame key={current.key}>{current.content}</PhoneFrame></div>
    <div className="flex w-full max-w-sm flex-col gap-2.5 sm:flex-row">
      <Link href={current.shopHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-bg no-underline hover:bg-gold">{es ? "Consigue tu SnapLink" : "Get your SnapLink"} →</Link>
      <Link href={current.startHref} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-line-strong px-5 py-3 text-sm text-ink no-underline hover:border-gold hover:text-gold">{es ? "Crear el mío" : "Build mine"}</Link>
    </div>
    <Link href={current.href} className="text-sm text-ink-soft underline underline-offset-4 hover:text-gold">{es ? `Ver el ejemplo completo: ${current.label}` : `See the full ${current.label} example`}</Link>
  </div>;
}

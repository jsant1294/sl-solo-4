"use client";
import { useState } from "react";
import type { Talent } from "@/lib/talent/model";
import { translate } from "@/lib/talent/model";
import { normalizeMedia } from "@/lib/talent/media";
import { talentLabels } from "@/lib/talent/labels";

export function TalentMedia({ item, locale }: { item: Talent["media"][number]; locale: "en" | "es" }) {
  const [playing, setPlaying] = useState(false); const [failed, setFailed] = useState(false);
  const source = normalizeMedia(item.url); if (!source) return null;
  const t = talentLabels[locale]; const title = translate(item.title, locale); const alt = translate(item.alt, locale) || title;
  return <figure className="overflow-hidden rounded-2xl border border-line bg-bg-raised">
    {item.kind === "image" ? !failed && <img src={source.url} alt={alt} loading="lazy" onError={() => setFailed(true)} className="w-full aspect-[4/3] object-cover" /> : <>
      {playing && !failed && source.embed ? <iframe src={source.embed} title={title || t.reel} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className="w-full aspect-video border-0" />
        : playing && !failed && source.direct ? <video src={source.url} controls preload="metadata" playsInline poster={item.poster || undefined} onError={() => setFailed(true)} className="w-full aspect-video" />
        : <div className="relative aspect-video bg-bg-sunken flex items-center justify-center">
          {item.poster && !failed && <img src={item.poster} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />}
          {(source.embed || source.direct) && !failed ? <button onClick={() => setPlaying(true)} className="relative rounded-full bg-ink text-bg px-6 py-3 font-medium">▶ {t.play}</button> : <a href={source.url} target="_blank" rel="noopener noreferrer" className="relative rounded-full bg-ink text-bg px-6 py-3">{t.open} ↗</a>}
        </div>}
    </>}
    <figcaption className="p-5"><p className="font-medium">{title}</p>{translate(item.caption, locale) && <p className="text-sm text-ink-soft mt-1">{translate(item.caption, locale)}</p>}<a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm underline underline-offset-4 mt-3">{t.open} ↗</a></figcaption>
  </figure>;
}

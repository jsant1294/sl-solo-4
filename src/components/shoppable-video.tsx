"use client";
import Link from "next/link";
import { useRef } from "react";

export function ShoppableVideo({ productId, slug, mediaId, src, poster }: { productId: string; slug: string; mediaId: string; src: string; poster?: string }) {
  const started = useRef(false);
  const track = (type: string) => navigator.sendBeacon?.("/api/commerce-event", new Blob([JSON.stringify({ type, productId, mediaId })], { type: "application/json" }));
  return <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black aspect-[9/16] max-h-[680px]">
    <video src={src} poster={poster} muted playsInline loop preload="metadata" autoPlay className="h-full w-full object-cover"
      onLoadedData={() => track("video_impression")} onPlay={() => { if (!started.current) { started.current = true; track("video_start"); } }} onEnded={() => track("video_complete")}/>
    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10"/>
    <div className="absolute inset-x-0 bottom-0 p-6 text-white"><p className="font-display text-4xl leading-none">TAP.<br/>CONNECT.<br/>DONE.</p><Link href={`/hardware/${slug}`} onClick={() => track("video_cta_click")} className="inline-flex mt-5 rounded-full bg-white px-5 py-2.5 text-sm text-black no-underline">Shop this SnapLink</Link></div>
  </div>;
}

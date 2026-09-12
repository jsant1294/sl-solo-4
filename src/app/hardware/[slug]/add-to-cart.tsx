"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { addToCart } from "@/app/(shop)/cart-actions";
import { uploadCustomArtReference } from "./customart-actions";
import { Glyph } from "@/components/primitives";

const CONFETTI_COLORS = ["#e76455", "#68449a", "#257f95", "#dda91f", "#2d9a80"];

interface Variant { id: string; label: string; color: string | null; priceDelta: number }

export function AddToCart({
  product, locale, labels,
}: {
  product: { id: string; basePrice: number; personalizationAvailable: boolean; customArtAvailable: boolean; customArtPriceCents: number | null; variants: Variant[] };
  locale: Locale;
  labels: { add: string; personalize: string; color: string; added: string; viewCart: string; customArt: string; customArtNotes: string; customArtUpload: string; customArtUploading: string; customArtUploaded: string; customArtUploadError: string };
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? null);
  const [personalization, setPersonalization] = useState("");
  const [customArt, setCustomArt] = useState(false);
  const [customArtNotes, setCustomArtNotes] = useState("");
  const [customArtFileUrl, setCustomArtFileUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "busy" | "error">("idle");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  async function uploadFile(file: File) {
    setUploadState("busy"); setCustomArtFileUrl(null);
    const form = new FormData();
    form.set("productId", product.id); form.set("file", file);
    const result = await uploadCustomArtReference(form);
    if (result.ok) { setCustomArtFileUrl(result.url); setUploadState("idle"); }
    else setUploadState("error");
  }

  async function add() {
    setBusy(true);
    await addToCart({
      productId: product.id, variantId, personalization: personalization || undefined,
      customArt: customArt || undefined, customArtNotes: customArt && customArtNotes ? customArtNotes : undefined,
      customArtFileUrl: customArt && customArtFileUrl ? customArtFileUrl : undefined,
      quantity: 1,
    });
    setBusy(false); setAdded(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {product.variants.length > 1 && (
        <div>
          <p className="text-xs text-ink-soft mb-2">{labels.color}</p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button key={v.id} onClick={() => setVariantId(v.id)}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  variantId === v.id ? "border-gold text-gold" : "border-line text-ink-soft hover:border-line-strong"}`}>
                {v.color && <span className="w-3.5 h-3.5 rounded-full border border-line-strong" style={{ background: v.color }} />}
                {v.label}
                {v.priceDelta > 0 && <span className="font-mono text-xs">+${(v.priceDelta / 100).toFixed(0)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.personalizationAvailable && (
        <label className="block">
          <span className="text-xs text-ink-soft">{labels.personalize}</span>
          <input value={personalization} onChange={(e) => setPersonalization(e.target.value)} maxLength={20}
            className="mt-1.5 w-full max-w-xs rounded-lg border border-line bg-bg-raised px-4 py-2.5 text-sm text-ink focus:border-gold outline-none" />
        </label>
      )}

      {product.customArtAvailable && product.customArtPriceCents !== null && (
        <div className="rounded-lg border border-gold/40 bg-gold/5 p-4">
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={customArt} onChange={(e) => setCustomArt(e.target.checked)} className="mt-0.5"/>
            <span>{labels.customArt} <span className="font-mono text-xs text-gold">+${(product.customArtPriceCents / 100).toFixed(0)}</span></span>
          </label>
          {customArt && (
            <>
              <textarea value={customArtNotes} onChange={(e) => setCustomArtNotes(e.target.value)} maxLength={500} rows={3}
                placeholder={labels.customArtNotes}
                className="mt-3 w-full rounded-lg border border-line bg-bg-raised px-4 py-2.5 text-sm text-ink focus:border-gold outline-none"/>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-bg-raised px-4 py-2 text-xs font-medium text-ink-soft cursor-pointer hover:border-gold">
                  {uploadState === "busy" ? labels.customArtUploading : customArtFileUrl ? labels.customArtUploaded : labels.customArtUpload}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadFile(file); }}/>
                </span>
                {customArtFileUrl && <img src={customArtFileUrl} alt="" className="h-16 w-16 rounded-lg border border-line object-cover"/>}
                {uploadState === "error" && <span className="text-xs text-err">{labels.customArtUploadError}</span>}
              </label>
            </>
          )}
        </div>
      )}

      <div className="relative flex items-center gap-3">
        <motion.button onClick={add} disabled={busy}
          animate={added ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}
          className="inline-flex items-center justify-center gap-2 bg-ink text-bg rounded-full px-8 py-4 font-medium hover:bg-gold transition-colors disabled:opacity-50">
          {busy ? "…" : added ? <>{labels.added}<Glyph.check className="w-4 h-4" /></> : <>{labels.add}<Glyph.arrow className="w-4 h-4" /></>}
        </motion.button>
        <AnimatePresence>
          {added && (
            <div className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2">
              {CONFETTI_COLORS.map((c, i) => (
                <motion.span key={i} className="absolute h-1.5 w-1.5 rounded-full" style={{ background: c, left: 0, top: 0 }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos((i / CONFETTI_COLORS.length) * Math.PI * 2) * 44, y: Math.sin((i / CONFETTI_COLORS.length) * Math.PI * 2) * 44 - 20, opacity: 0, scale: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}/>
              ))}
            </div>
          )}
        </AnimatePresence>
        {added && (
          <button onClick={() => router.push(withLang("/cart", locale))}
            className="text-sm text-ink-soft hover:text-gold">{labels.viewCart}</button>
        )}
      </div>
    </div>
  );
}

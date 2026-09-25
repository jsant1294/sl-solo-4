"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { addBundleToCart } from "@/app/(shop)/cart-actions";
import { Glyph } from "@/components/primitives";

interface SlotOption { componentProductId: string; componentVariantId: string | null; label: string; priceDelta: number; color: string | null; available: boolean }
interface Slot { slotKey: string; label: string; allowCustomerChoice: boolean; options: SlotOption[] }

export function BundleAddToCart({
  bundleProductId, slots, locale,
}: { bundleProductId: string; slots: Slot[]; locale: Locale }) {
  const router = useRouter();
  const es = locale === "es";
  const choosableSlots = useMemo(() => slots.filter((s) => s.allowCustomerChoice && s.options.length > 1), [slots]);
  const [choices, setChoices] = useState<Record<string, number>>(() =>
    Object.fromEntries(choosableSlots.map((s) => [s.slotKey, Math.max(0, s.options.findIndex((o) => o.available))])));
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true); setError(null);
    const payload: Record<string, { productId: string; variantId: string | null }> = {};
    for (const slot of slots) {
      const options = slot.options;
      const chosenIndex = slot.allowCustomerChoice ? (choices[slot.slotKey] ?? 0) : 0;
      const chosen = options[chosenIndex] ?? options[0];
      if (!chosen || !chosen.available) { setBusy(false); setError(es ? "Elige una opción disponible." : "Choose an available option."); return; }
      payload[slot.slotKey] = { productId: chosen.componentProductId, variantId: chosen.componentVariantId };
    }
    const result = await addBundleToCart({ bundleProductId, choices: payload });
    setBusy(false);
    if (result.ok) setAdded(true); else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-5">
      {choosableSlots.map((slot) => (
        <div key={slot.slotKey}>
          <p className="text-xs text-ink-soft mb-2">{slot.label}</p>
          <div className="flex flex-wrap gap-2">
            {slot.options.map((opt, i) => (
              <button key={`${opt.componentProductId}-${opt.componentVariantId ?? "base"}`}
                disabled={!opt.available}
                onClick={() => setChoices((c) => ({ ...c, [slot.slotKey]: i }))}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  !opt.available ? "border-line text-ink-faint opacity-50 cursor-not-allowed"
                    : (choices[slot.slotKey] ?? 0) === i ? "border-gold text-gold" : "border-line text-ink-soft hover:border-line-strong"}`}>
                {opt.color && <span className="w-3.5 h-3.5 rounded-full border border-line-strong" style={{ background: opt.color }} />}
                {opt.label}
                {opt.priceDelta > 0 && <span className="font-mono text-xs">+${(opt.priceDelta / 100).toFixed(0)}</span>}
                {!opt.available && <span className="text-xs">({es ? "agotado" : "out of stock"})</span>}
              </button>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-err">{error}</p>}

      <div className="relative flex items-center gap-3">
        <button onClick={add} disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-ink text-bg rounded-full px-8 py-4 font-medium hover:bg-gold transition-colors disabled:opacity-50">
          {busy ? "…" : added ? <>{es ? "Agregado" : "Added"}<Glyph.check className="w-4 h-4" /></> : <>{es ? "Obtén el kit" : "Get the kit"}<Glyph.arrow className="w-4 h-4" /></>}
        </button>
        {added && (
          <button onClick={() => router.push(withLang("/cart", locale))}
            className="text-sm text-ink-soft hover:text-gold">{es ? "Ver carrito" : "View cart"}</button>
        )}
      </div>
    </div>
  );
}

"use client";
import type { Locale } from "@/i18n/dict";
import { updateQty, removeLine } from "@/app/(shop)/cart-actions";

export function CartControls({ index, quantity, locale }: { index: number; quantity: number; locale: Locale }) {
  const es = locale === "es";
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="inline-flex items-center border border-line rounded-full">
        <button onClick={() => updateQty(index, quantity - 1)} className="px-3 py-1 text-ink-soft hover:text-ink" aria-label="decrease">−</button>
        <span className="px-2 text-sm font-mono">{quantity}</span>
        <button onClick={() => updateQty(index, quantity + 1)} className="px-3 py-1 text-ink-soft hover:text-ink" aria-label="increase">+</button>
      </div>
      <button onClick={() => removeLine(index)} className="text-xs text-ink-faint hover:text-err">{es ? "Quitar" : "Remove"}</button>
    </div>
  );
}

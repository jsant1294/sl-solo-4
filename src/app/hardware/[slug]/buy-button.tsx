"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";
import { Glyph } from "@/components/primitives";

export function BuyButton({ slug, locale, label }: { slug: string; locale: Locale; label: string }) {
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: slug, quantity: 1, locale }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url; // Stripe Checkout
      else alert(data.error ?? "Checkout unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={checkout} disabled={loading}
      className="inline-flex items-center justify-center gap-2 bg-ink text-bg rounded-full px-8 py-4 font-medium hover:bg-gold transition-colors disabled:opacity-50 w-full sm:w-auto">
      {loading ? "…" : <>{label}<Glyph.arrow className="w-4 h-4" /></>}
    </button>
  );
}

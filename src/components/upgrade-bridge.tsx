"use client";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import { Glyph } from "@/components/primitives";

export function UpgradeBridge({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const toggle = (n: string) =>
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  async function submit() {
    // @wire: POST /api/upgrade-intent { needs: selected } → UpgradeIntent row
    await new Promise((r) => setTimeout(r, 300));
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-ok/40 bg-bg-raised p-8 text-center max-w-lg">
        <div className="w-12 h-12 rounded-full bg-ok/15 text-ok grid place-items-center mx-auto mb-4">
          <Glyph.check className="w-6 h-6" />
        </div>
        <p className="font-display text-xl">{t.upgrade.submitted}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="font-medium mb-4">{t.upgrade.question}</p>
      <div className="flex flex-wrap gap-2">
        {t.upgrade.needs.map((n) => (
          <button key={n} onClick={() => toggle(n)}
            className={`rounded-full border px-4 py-2 text-sm transition-colors ${
              selected.includes(n) ? "border-gold bg-gold/10 text-gold" : "border-line text-ink-soft hover:border-line-strong"}`}>
            {n}
          </button>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-line bg-bg-sunken p-6">
        <p className="font-display text-lg">{t.upgrade.pitch}</p>
        <button onClick={submit} disabled={selected.length === 0}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-40">
          {t.upgrade.cta}<Glyph.arrow className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

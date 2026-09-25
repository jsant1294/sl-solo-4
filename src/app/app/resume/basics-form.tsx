"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";
import { saveResumeBasics } from "./actions";

export function BasicsForm({ initialHeadline, initialSummary, locale }: { initialHeadline: string; initialSummary: string; locale: Locale }) {
  const es = locale === "es";
  const [headline, setHeadline] = useState(initialHeadline);
  const [summary, setSummary] = useState(initialSummary);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputCls = "w-full rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-sm focus:border-gold outline-none";

  async function save() {
    setBusy(true); setSaved(false);
    const result = await saveResumeBasics({ headline, professionalSummary: summary });
    setBusy(false);
    if (result.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-1.5 text-xs font-medium text-ink-soft">
        {es ? "Título profesional" : "Professional headline"}
        <input className={inputCls} value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160} placeholder={es ? "Chef de Eventos · Chef de Catering" : "Event Chef · Catering Chef"} />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-ink-soft">
        {es ? "Resumen profesional" : "Professional summary"}
        <textarea className={inputCls} rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={4000} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50 self-start">{busy ? "…" : (es ? "Guardar" : "Save")}</button>
        {saved && <span className="text-xs text-ok">{es ? "Guardado" : "Saved"}</span>}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { setNotes, setFollowUp, deleteConnection } from "./actions";

export function NotesEditor({ id, initialNotes, locale }: { id: string; initialNotes: string; locale: Locale }) {
  const es = locale === "es";
  const [notes, setNotesState] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const result = await setNotes(id, notes);
    setBusy(false);
    if (result.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gold font-mono mb-2">{es ? "Notas" : "Notes"}</p>
      <textarea value={notes} onChange={(e) => setNotesState(e.target.value)} rows={4}
        placeholder={es ? "Notas privadas — nunca visibles en tu perfil público." : "Private notes — never shown on your public profile."}
        className="w-full rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-sm focus:border-gold outline-none" />
      <div className="mt-2 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-full border border-line-strong px-4 py-2 text-xs hover:border-gold disabled:opacity-50">
          {busy ? "…" : (es ? "Guardar notas" : "Save notes")}
        </button>
        {saved && <span className="text-xs text-ok">{es ? "Guardado" : "Saved"}</span>}
      </div>
    </div>
  );
}

export function FollowUpControl({ id, initialDate, locale }: { id: string; initialDate: string | null; locale: Locale }) {
  const es = locale === "es";
  const [date, setDate] = useState(initialDate ?? "");
  const [busy, setBusy] = useState(false);

  async function save(next: string) {
    setBusy(true);
    const result = await setFollowUp(id, next || null);
    setBusy(false);
    if (result.ok) setDate(next);
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gold font-mono mb-2">{es ? "Seguimiento" : "Follow-up"}</p>
      <div className="flex items-center gap-3">
        <input type="date" value={date} disabled={busy} onChange={(e) => void save(e.target.value)}
          className="rounded-lg border border-line bg-bg-raised px-3.5 py-2 text-sm focus:border-gold outline-none" />
        {date && <button disabled={busy} onClick={() => void save("")} className="text-xs text-ink-faint hover:text-err">{es ? "Quitar" : "Clear"}</button>}
      </div>
    </div>
  );
}

export function DeleteConnectionButton({ id, locale }: { id: string; locale: Locale }) {
  const router = useRouter();
  const es = locale === "es";
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return <button onClick={() => setConfirming(true)} className="text-xs text-ink-faint hover:text-err">{es ? "Eliminar contacto" : "Delete connection"}</button>;
  }
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-ink-soft">{es ? "¿Eliminar este contacto?" : "Delete this connection?"}</span>
      <button disabled={busy} onClick={async () => { setBusy(true); const r = await deleteConnection(id); if (r.ok) router.push(withLang("/app/networking", locale)); else setBusy(false); }} className="text-err hover:underline">
        {es ? "Sí, eliminar" : "Yes, delete"}
      </button>
      <button disabled={busy} onClick={() => setConfirming(false)} className="text-ink-faint hover:text-ink">{es ? "Cancelar" : "Cancel"}</button>
    </div>
  );
}

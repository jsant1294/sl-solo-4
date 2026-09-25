"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { checkDuplicateConnection, createManualConnection, saveScannedConnection, updateConnection } from "./actions";
import type { NetworkingLead } from "@/db/schema";

export type ConnectionFields = {
  firstName: string; lastName: string; displayName: string; company: string; jobTitle: string;
  email: string; phone: string; website: string; addressLine: string; city: string; region: string;
  postalCode: string; country: string; linkedinUrl: string; notes: string;
};

const EMPTY: ConnectionFields = {
  firstName: "", lastName: "", displayName: "", company: "", jobTitle: "", email: "", phone: "",
  website: "", addressLine: "", city: "", region: "", postalCode: "", country: "", linkedinUrl: "", notes: "",
};

export function ConnectionForm({
  mode, leadId, initial, rawExtraction, locale,
}: { mode: "manual" | "scan" | "edit"; leadId?: string; initial?: Partial<ConnectionFields>; rawExtraction?: string | null; locale: Locale }) {
  const router = useRouter();
  const es = locale === "es";
  const [fields, setFields] = useState<ConnectionFields>({ ...EMPTY, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<NetworkingLead | null>(null);

  const set = (key: keyof ConnectionFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  function displayName() {
    if (fields.displayName.trim()) return fields.displayName.trim();
    const combined = [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim();
    return combined;
  }

  async function doSave(asNew: boolean) {
    setBusy(true); setError(null);
    const payload = { ...fields, displayName: displayName() };
    const result = mode === "edit" && leadId
      ? await updateConnection(leadId, payload)
      : (asNew || !duplicate)
        ? (mode === "scan" ? await saveScannedConnection(payload, rawExtraction ?? null) : await createManualConnection(payload))
        : await updateConnection(duplicate.id, payload);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    router.push(withLang(`/app/networking/${result.id}`, locale));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!displayName()) { setError(es ? "Ingresa al menos un nombre" : "Enter at least a name"); return; }
    if (mode !== "edit" && !duplicate && (fields.email || fields.phone)) {
      const check = await checkDuplicateConnection({ email: fields.email, phone: fields.phone });
      if (check.duplicate) { setDuplicate(check.duplicate); return; }
    }
    await doSave(false);
  }

  const input = "w-full rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-sm focus:border-gold outline-none";
  const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

  if (duplicate) {
    return (
      <div className="rounded-xl border border-gold/40 bg-gold/5 p-5">
        <p className="text-xs uppercase tracking-widest text-gold font-mono mb-2">{es ? "Posible contacto existente" : "Possible existing connection"}</p>
        <p className="font-display text-lg">{duplicate.displayName}</p>
        {duplicate.company && <p className="text-sm text-ink-soft">{duplicate.company}</p>}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button disabled={busy} onClick={() => doSave(false)} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50">
            {es ? "Actualizar existente" : "Update Existing"}
          </button>
          <button disabled={busy} onClick={() => doSave(true)} className="rounded-full border border-line-strong px-5 py-2.5 text-sm hover:border-gold disabled:opacity-50">
            {es ? "Guardar como nuevo" : "Save As New"}
          </button>
          <button disabled={busy} onClick={() => setDuplicate(null)} className="text-sm text-ink-faint hover:text-ink">{es ? "Cancelar" : "Cancel"}</button>
        </div>
        {error && <p className="mt-3 text-sm text-err">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={label}>{es ? "Nombre" : "First name"}<input className={input} value={fields.firstName} onChange={set("firstName")} /></label>
        <label className={label}>{es ? "Apellido" : "Last name"}<input className={input} value={fields.lastName} onChange={set("lastName")} /></label>
      </div>
      <label className={label}>{es ? "Nombre completo" : "Full name"}<input className={input} value={fields.displayName} onChange={set("displayName")} placeholder={displayName() || (es ? "Requerido si no hay nombre/apellido" : "Required if no first/last name")} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={label}>{es ? "Puesto" : "Job title"}<input className={input} value={fields.jobTitle} onChange={set("jobTitle")} /></label>
        <label className={label}>{es ? "Empresa" : "Company"}<input className={input} value={fields.company} onChange={set("company")} /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={label}>{es ? "Teléfono" : "Phone"}<input className={input} value={fields.phone} onChange={set("phone")} /></label>
        <label className={label}>{es ? "Correo" : "Email"}<input className={input} type="email" value={fields.email} onChange={set("email")} /></label>
      </div>
      <label className={label}>{es ? "Sitio web" : "Website"}<input className={input} value={fields.website} onChange={set("website")} /></label>
      <label className={label}>LinkedIn<input className={input} value={fields.linkedinUrl} onChange={set("linkedinUrl")} /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className={label}>{es ? "Dirección" : "Address"}<input className={input} value={fields.addressLine} onChange={set("addressLine")} /></label>
        <label className={label}>{es ? "Ciudad" : "City"}<input className={input} value={fields.city} onChange={set("city")} /></label>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <label className={label}>{es ? "Estado/Región" : "State/Region"}<input className={input} value={fields.region} onChange={set("region")} /></label>
        <label className={label}>{es ? "Código postal" : "Postal code"}<input className={input} value={fields.postalCode} onChange={set("postalCode")} /></label>
        <label className={label}>{es ? "País" : "Country"}<input className={input} value={fields.country} onChange={set("country")} /></label>
      </div>
      <label className={label}>{es ? "Notas" : "Notes"}<textarea className={input} rows={3} value={fields.notes} onChange={set("notes")} /></label>

      {error && <p className="text-sm text-err">{error}</p>}
      <button disabled={busy} className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50 self-start">
        {busy ? "…" : (mode === "edit" ? (es ? "Guardar cambios" : "Save changes") : (es ? "Guardar contacto" : "Save Connection"))}
      </button>
    </form>
  );
}

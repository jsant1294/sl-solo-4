"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";
import { saveSectionItem, deleteSectionItem, type SectionName } from "./actions";

type FieldType = "text" | "textarea" | "date" | "checkbox";
export type FieldConfig = { key: string; labelEn: string; labelEs: string; type: FieldType; required?: boolean };

export const SECTION_FIELDS: Record<SectionName, FieldConfig[]> = {
  experience: [
    { key: "title", labelEn: "Title / Role", labelEs: "Puesto", type: "text", required: true },
    { key: "company", labelEn: "Company / Client / Organization (optional)", labelEs: "Empresa / Cliente / Organización (opcional)", type: "text" },
    { key: "location", labelEn: "Location", labelEs: "Ubicación", type: "text" },
    { key: "startDate", labelEn: "Start", labelEs: "Inicio", type: "text" },
    { key: "endDate", labelEn: "End", labelEs: "Fin", type: "text" },
    { key: "current", labelEn: "Current role", labelEs: "Puesto actual", type: "checkbox" },
    { key: "description", labelEn: "Description", labelEs: "Descripción", type: "textarea" },
  ],
  education: [
    { key: "institution", labelEn: "Institution", labelEs: "Institución", type: "text", required: true },
    { key: "degree", labelEn: "Degree", labelEs: "Título", type: "text" },
    { key: "fieldOfStudy", labelEn: "Field of study", labelEs: "Área de estudio", type: "text" },
    { key: "location", labelEn: "Location", labelEs: "Ubicación", type: "text" },
    { key: "startDate", labelEn: "Start", labelEs: "Inicio", type: "text" },
    { key: "endDate", labelEn: "End", labelEs: "Fin", type: "text" },
    { key: "description", labelEn: "Description", labelEs: "Descripción", type: "textarea" },
  ],
  skills: [
    { key: "name", labelEn: "Skill", labelEs: "Habilidad", type: "text", required: true },
    { key: "category", labelEn: "Category", labelEs: "Categoría", type: "text" },
  ],
  certifications: [
    { key: "name", labelEn: "Certification", labelEs: "Certificación", type: "text", required: true },
    { key: "issuer", labelEn: "Issuer", labelEs: "Emisor", type: "text" },
    { key: "issueDate", labelEn: "Issue date", labelEs: "Fecha de emisión", type: "text" },
    { key: "expirationDate", labelEn: "Expiration date", labelEs: "Fecha de expiración", type: "text" },
    { key: "credentialId", labelEn: "Credential ID", labelEs: "ID de credencial", type: "text" },
    { key: "credentialUrl", labelEn: "Credential URL", labelEs: "URL de credencial", type: "text" },
  ],
  languages: [
    { key: "language", labelEn: "Language", labelEs: "Idioma", type: "text", required: true },
    { key: "proficiency", labelEn: "Proficiency", labelEs: "Nivel", type: "text" },
  ],
  projects: [
    { key: "name", labelEn: "Project", labelEs: "Proyecto", type: "text", required: true },
    { key: "role", labelEn: "Role", labelEs: "Rol", type: "text" },
    { key: "description", labelEn: "Description", labelEs: "Descripción", type: "textarea" },
    { key: "url", labelEn: "URL", labelEs: "URL", type: "text" },
    { key: "startDate", labelEn: "Start", labelEs: "Inicio", type: "text" },
    { key: "endDate", labelEn: "End", labelEs: "Fin", type: "text" },
  ],
};

const TITLE_KEY: Record<SectionName, string> = { experience: "title", education: "institution", skills: "name", certifications: "name", languages: "language", projects: "name" };
const SUBTITLE_KEY: Record<SectionName, string | null> = { experience: "company", education: "degree", skills: "category", certifications: "issuer", languages: "proficiency", projects: "role" };

type Item = Record<string, unknown> & { id: string; sortOrder: number; visible: boolean };

export function SectionEditor({ section, resumeProfileId, items, locale }: { section: SectionName; resumeProfileId: string; items: Item[]; locale: Locale }) {
  const es = locale === "es";
  const fields = SECTION_FIELDS[section];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [localItems, setLocalItems] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleVisible(item: Item) {
    setBusy(item.id);
    const result = await saveSectionItem(section, item.id, resumeProfileId, { ...item, visible: !item.visible });
    setBusy(null);
    if (result.ok) setLocalItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, visible: !i.visible } : i)));
  }

  async function remove(id: string) {
    setBusy(id);
    const result = await deleteSectionItem(section, id, resumeProfileId);
    setBusy(null);
    if (result.ok) setLocalItems((cur) => cur.filter((i) => i.id !== id));
  }

  return (
    <div className="grid gap-3">
      {localItems.map((item) => (
        editingId === item.id ? (
          <SectionForm key={item.id} section={section} fields={fields} resumeProfileId={resumeProfileId} initial={item} locale={locale}
            onDone={(saved) => { setLocalItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, ...saved } : i))); setEditingId(null); }}
            onCancel={() => setEditingId(null)} />
        ) : (
          <div key={item.id} className={`rounded-xl border border-line bg-bg-raised p-4 ${!item.visible ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{String(item[TITLE_KEY[section]] ?? "")}</p>
                {SUBTITLE_KEY[section] && item[SUBTITLE_KEY[section]!] ? <p className="text-sm text-gold truncate">{String(item[SUBTITLE_KEY[section]!])}</p> : null}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs">
                <button disabled={busy === item.id} onClick={() => toggleVisible(item)} className="text-ink-faint hover:text-ink">{item.visible ? (es ? "Ocultar" : "Hide") : (es ? "Mostrar" : "Show")}</button>
                <button onClick={() => setEditingId(item.id)} className="text-ink-faint hover:text-gold">{es ? "Editar" : "Edit"}</button>
                <button disabled={busy === item.id} onClick={() => remove(item.id)} className="text-ink-faint hover:text-err">{es ? "Eliminar" : "Delete"}</button>
              </div>
            </div>
          </div>
        )
      ))}

      {adding ? (
        <SectionForm section={section} fields={fields} resumeProfileId={resumeProfileId} locale={locale}
          onDone={(saved) => { setLocalItems((cur) => [...cur, saved as Item]); setAdding(false); }}
          onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="rounded-xl border border-dashed border-line-strong px-4 py-3 text-sm text-ink-soft hover:border-gold hover:text-gold transition-colors text-left">
          {es ? "+ Agregar" : "+ Add"}
        </button>
      )}
    </div>
  );
}

function SectionForm({
  section, fields, resumeProfileId, initial, locale, onDone, onCancel,
}: { section: SectionName; fields: FieldConfig[]; resumeProfileId: string; initial?: Item; locale: Locale; onDone: (item: Item) => void; onCancel: () => void }) {
  const es = locale === "es";
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.key, initial?.[f.key] ?? (f.type === "checkbox" ? false : "")])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputCls = "w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm focus:border-gold outline-none";

  async function save() {
    setBusy(true); setError(null);
    const result = await saveSectionItem(section, initial?.id ?? null, resumeProfileId, values);
    setBusy(false);
    if (!result.ok) { setError(result.error); return; }
    onDone({ id: result.id, sortOrder: initial?.sortOrder ?? 0, visible: initial?.visible ?? true, ...values } as Item);
  }

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-4 grid gap-3">
      {fields.map((f) => (
        <label key={f.key} className={f.type === "checkbox" ? "flex items-center gap-2 text-sm" : "grid gap-1.5 text-xs font-medium text-ink-soft"}>
          {f.type === "checkbox" ? (
            <>
              <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked }))} />
              {es ? f.labelEs : f.labelEn}
            </>
          ) : (
            <>
              {es ? f.labelEs : f.labelEn}{f.required ? " *" : ""}
              {f.type === "textarea"
                ? <textarea className={inputCls} rows={3} value={String(values[f.key] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
                : <input className={inputCls} value={String(values[f.key] ?? "")} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />}
            </>
          )}
        </label>
      ))}
      {error && <p className="text-sm text-err">{error}</p>}
      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="rounded-full bg-ink text-bg px-5 py-2 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50">{busy ? "…" : (es ? "Guardar" : "Save")}</button>
        <button disabled={busy} onClick={onCancel} className="text-sm text-ink-faint hover:text-ink">{es ? "Cancelar" : "Cancel"}</button>
      </div>
    </div>
  );
}

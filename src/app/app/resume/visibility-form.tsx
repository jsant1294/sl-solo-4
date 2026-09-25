"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";
import { saveResumeVisibility } from "./actions";
import type { ResumeProfile } from "@/db/schema";

type VisibilityKey = "publicEnabled" | "showSummary" | "showExperience" | "showEducation" | "showSkills" | "showCertifications" | "showLanguages" | "showProjects" | "showEmail" | "showPhone" | "showLocation" | "showWebsite" | "showOriginalPdf";

const ROWS: { key: VisibilityKey; en: string; es: string; group: "master" | "sections" | "contact" }[] = [
  { key: "publicEnabled", en: "Public resume page", es: "Página pública de currículum", group: "master" },
  { key: "showSummary", en: "Professional summary", es: "Resumen profesional", group: "sections" },
  { key: "showExperience", en: "Experience", es: "Experiencia", group: "sections" },
  { key: "showEducation", en: "Education", es: "Educación", group: "sections" },
  { key: "showSkills", en: "Skills", es: "Habilidades", group: "sections" },
  { key: "showCertifications", en: "Certifications", es: "Certificaciones", group: "sections" },
  { key: "showLanguages", en: "Languages", es: "Idiomas", group: "sections" },
  { key: "showProjects", en: "Projects", es: "Proyectos", group: "sections" },
  { key: "showEmail", en: "Email address", es: "Correo electrónico", group: "contact" },
  { key: "showPhone", en: "Phone number", es: "Teléfono", group: "contact" },
  { key: "showLocation", en: "Location", es: "Ubicación", group: "contact" },
  { key: "showWebsite", en: "Website", es: "Sitio web", group: "contact" },
  { key: "showOriginalPdf", en: "Original PDF download", es: "Descarga del PDF original", group: "contact" },
];

export function VisibilityForm({ resume, canPublish, canDownloadPdf, locale }: { resume: Pick<ResumeProfile, VisibilityKey | "ctaLabelEn" | "ctaLabelEs">; canPublish: boolean; canDownloadPdf: boolean; locale: Locale }) {
  const es = locale === "es";
  const [values, setValues] = useState<Record<VisibilityKey, boolean>>(() => Object.fromEntries(ROWS.map((r) => [r.key, resume[r.key]])) as Record<VisibilityKey, boolean>);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setSaved(false);
    const result = await saveResumeVisibility({ ...values, ctaLabelEn: resume.ctaLabelEn ?? undefined, ctaLabelEs: resume.ctaLabelEs ?? undefined });
    setBusy(false);
    if (result.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
  }

  const toggle = (row: typeof ROWS[number]) => {
    const disabled = (row.key === "publicEnabled" && !canPublish) || (row.key === "showOriginalPdf" && !canDownloadPdf);
    return (
      <label key={row.key} className={`flex items-center justify-between gap-3 py-2 ${disabled ? "opacity-40" : ""}`}>
        <span className="text-sm">{es ? row.es : row.en}</span>
        <input type="checkbox" disabled={disabled} checked={values[row.key]} onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.checked }))} />
      </label>
    );
  };

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-mono mb-1">{es ? "Visibilidad" : "Visibility"}</p>
        {ROWS.filter((r) => r.group === "master").map(toggle)}
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-faint font-mono mb-1">{es ? "Secciones" : "Sections"}</p>
        {ROWS.filter((r) => r.group === "sections").map(toggle)}
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-faint font-mono mb-1">{es ? "Contacto" : "Contact"}</p>
        {ROWS.filter((r) => r.group === "contact").map(toggle)}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={busy} onClick={save} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50 self-start">{busy ? "…" : (es ? "Guardar" : "Save")}</button>
        {saved && <span className="text-xs text-ok">{es ? "Guardado" : "Saved"}</span>}
      </div>
    </div>
  );
}

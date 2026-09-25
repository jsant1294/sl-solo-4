"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { uploadResume, applyExtraction, type UploadResult } from "./actions";
import type { StructuredResumeExtraction } from "@/lib/providers";

export function UploadFlow({ locale, aiExtractionEnabled, hasExistingFile, allowedDocumentTypes }: { locale: Locale; aiExtractionEnabled: boolean; hasExistingFile: boolean; allowedDocumentTypes: string[] }) {
  const router = useRouter();
  const es = locale === "es";
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "working" | "error" | "reviewing" | "uploaded">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [extraction, setExtraction] = useState<StructuredResumeExtraction | null>(null);
  const [applying, setApplying] = useState(false);
  const [pendingExtract, setPendingExtract] = useState(false);

  async function handleFile(file: File, extract: boolean) {
    setState("working"); setErrorMsg("");
    const form = new FormData();
    form.set("file", file);
    const result: UploadResult = await uploadResume(form, extract);
    if (!result.ok) { setErrorMsg(result.error); setState("error"); return; }
    if (result.extraction) { setExtraction(result.extraction); setState("reviewing"); }
    else setState("uploaded");
  }

  async function confirmExtraction() {
    if (!extraction) return;
    setApplying(true);
    const result = await applyExtraction(extraction);
    setApplying(false);
    if (result.ok) router.push(withLang("/app/resume/edit", locale));
  }

  if (state === "reviewing" && extraction) {
    return (
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-mono mb-2">{es ? "Encontramos esto" : "We found this"}</p>
        <p className="text-sm text-ink-faint mb-5">{es ? "Revisa antes de guardar — podrás editar todo después." : "Review before saving — you can edit everything afterward."}</p>
        <div className="rounded-xl border border-line bg-bg-raised p-5 grid gap-3 mb-6">
          <SummaryRow label={es ? "Nombre" : "Name"} value={extraction.name} />
          <SummaryRow label={es ? "Título" : "Headline"} value={extraction.headline} />
          <SummaryRow label={es ? "Resumen" : "Summary"} value={extraction.summary} />
          <SummaryRow label={es ? "Experiencia" : "Experience"} value={`${extraction.experience.length} ${es ? "puestos" : "roles"}`} />
          <SummaryRow label={es ? "Educación" : "Education"} value={`${extraction.education.length}`} />
          <SummaryRow label={es ? "Habilidades" : "Skills"} value={`${extraction.skills.length}`} />
        </div>
        <div className="flex gap-3">
          <button disabled={applying} onClick={confirmExtraction} className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-50">
            {applying ? "…" : (es ? "Guardar en mi currículum" : "Save to My Resume")}
          </button>
          <button disabled={applying} onClick={() => { setExtraction(null); setState("idle"); }} className="text-sm text-ink-faint hover:text-ink">{es ? "Descartar" : "Discard"}</button>
        </div>
      </div>
    );
  }

  if (state === "uploaded") {
    return (
      <div className="rounded-xl border border-ok/40 bg-ok/5 p-5">
        <p className="text-sm text-ok">{es ? "Archivo subido." : "File uploaded."}</p>
        <button onClick={() => router.push(withLang("/app/resume", locale))} className="mt-4 rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors">{es ? "Volver" : "Back"}</button>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-dashed border-line-strong bg-bg-sunken p-8 text-center">
        {state === "working" ? (
          <p className="text-sm text-ink-soft">{es ? "Procesando…" : "Processing…"}</p>
        ) : (
          <>
            <p className="font-display text-lg mb-1">{es ? "Sube tu currículum en PDF" : "Upload your resume as a PDF"}</p>
            <p className="text-xs text-ink-faint mb-4">{hasExistingFile ? (es ? "Esto reemplazará el archivo actual." : "This replaces your current file.") : ""}</p>
            <div className="flex flex-col gap-3 items-center">
              {aiExtractionEnabled && (
                <button onClick={() => { setPendingExtract(true); fileInput.current?.click(); }}
                  className="rounded-full bg-ink text-bg px-6 py-3.5 text-sm font-medium hover:bg-gold transition-colors w-full sm:w-auto">
                  {es ? "Subir y extraer con IA" : "Upload & Extract with AI"}
                </button>
              )}
              <button onClick={() => { setPendingExtract(false); fileInput.current?.click(); }}
                className="rounded-full border border-line-strong px-6 py-3.5 text-sm hover:border-gold transition-colors w-full sm:w-auto">
                {es ? "Solo subir archivo" : "Upload File Only"}
              </button>
            </div>
            <input ref={fileInput} type="file" accept={allowedDocumentTypes.join(",")} className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, pendingExtract); }} />
          </>
        )}
      </div>

      {state === "error" && (
        <div className="rounded-xl border border-err/40 bg-err/5 p-5">
          <p className="text-sm text-err">{errorMsg}</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setState("idle")} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors">{es ? "Intentar de nuevo" : "Try Again"}</button>
            <a href={withLang("/app/resume/edit", locale)} className="rounded-full border border-line-strong px-5 py-2.5 text-sm no-underline hover:border-gold">{es ? "Construir manualmente" : "Build Manually"}</a>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div><p className="text-xs text-ink-faint">{label}</p><p className="text-sm">{value}</p></div>;
}

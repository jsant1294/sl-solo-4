"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { scanBusinessCard, type ScanResult } from "./actions";
import { ConnectionForm, type ConnectionFields } from "./connection-form";

function candidateToFields(candidate: NonNullable<Extract<ScanResult, { ok: true }>["candidate"]>): Partial<ConnectionFields> {
  return {
    firstName: candidate.firstName ?? "", lastName: candidate.lastName ?? "",
    displayName: candidate.fullName ?? [candidate.firstName, candidate.lastName].filter(Boolean).join(" "),
    company: candidate.company ?? "", jobTitle: candidate.jobTitle ?? "",
    email: candidate.email ?? "", phone: candidate.mobilePhone ?? candidate.phone ?? "",
    website: candidate.website ?? "", addressLine: candidate.addressLine ?? "", city: candidate.city ?? "",
    region: candidate.region ?? "", postalCode: candidate.postalCode ?? "", country: candidate.country ?? "",
    linkedinUrl: candidate.linkedinUrl ?? "",
  };
}

export function ScanFlow({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "scanning" | "error" | "reviewing">("idle");
  const [result, setResult] = useState<Extract<ScanResult, { ok: true }> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function handleFile(file: File) {
    setState("scanning"); setErrorMsg("");
    const form = new FormData();
    form.set("file", file);
    const outcome = await scanBusinessCard(form);
    if (outcome.ok) { setResult(outcome); setState("reviewing"); }
    else { setErrorMsg(outcome.error); setState("error"); }
  }

  if (state === "reviewing" && result) {
    return (
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-mono mb-2">{es ? "Encontramos esto" : "We found this"}</p>
        <p className="text-sm text-ink-faint mb-5">{es ? "Revisa y corrige antes de guardar." : "Review and correct before saving."}</p>
        <ConnectionForm mode="scan" initial={candidateToFields(result.candidate)} rawExtraction={result.rawText} locale={locale} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-dashed border-line-strong bg-bg-sunken p-8 text-center">
        {state === "scanning" ? (
          <p className="text-sm text-ink-soft">{es ? "Leyendo la tarjeta…" : "Reading the card…"}</p>
        ) : (
          <>
            <p className="font-display text-lg mb-4">{es ? "Escanear tarjeta de presentación" : "Scan a Business Card"}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => cameraInput.current?.click()}
                className="rounded-full bg-ink text-bg px-6 py-3.5 text-sm font-medium hover:bg-gold transition-colors">
                {es ? "Tomar foto" : "Take Photo"}
              </button>
              <button onClick={() => fileInput.current?.click()}
                className="rounded-full border border-line-strong px-6 py-3.5 text-sm hover:border-gold transition-colors">
                {es ? "Elegir foto" : "Choose Photo"}
              </button>
            </div>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
            <input ref={fileInput} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          </>
        )}
      </div>

      {state === "error" && (
        <div className="rounded-xl border border-err/40 bg-err/5 p-5">
          <p className="text-sm text-err">{errorMsg}</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setState("idle")} className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium hover:bg-gold transition-colors">
              {es ? "Intentar de nuevo" : "Try Again"}
            </button>
            <Link href={withLang("/app/networking/new", locale)} className="rounded-full border border-line-strong px-5 py-2.5 text-sm no-underline hover:border-gold">
              {es ? "Agregar manualmente" : "Enter Manually"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

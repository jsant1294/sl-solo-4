"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/dict";
import { deleteOriginalFile } from "./actions";

export function CurrentFile({ fileName, locale }: { fileName: string; locale: Locale }) {
  const router = useRouter();
  const es = locale === "es";
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function remove() {
    setBusy(true);
    const result = await deleteOriginalFile();
    setBusy(false);
    if (result.ok) router.refresh();
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-line bg-bg-raised p-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-gold font-mono mb-1">{es ? "Archivo actual" : "Current file"}</p>
        <p className="text-sm truncate">{fileName}</p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2 text-xs shrink-0">
          <button disabled={busy} onClick={remove} className="text-err hover:underline">{es ? "Sí, eliminar" : "Yes, remove"}</button>
          <button disabled={busy} onClick={() => setConfirming(false)} className="text-ink-faint hover:text-ink">{es ? "Cancelar" : "Cancel"}</button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="text-xs text-ink-faint hover:text-err shrink-0">{es ? "Eliminar archivo" : "Remove file"}</button>
      )}
    </div>
  );
}

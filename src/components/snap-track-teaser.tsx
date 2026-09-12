"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/dict";

export function SnapTrackTeaser({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const es = locale === "es";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/snap-track", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="border-t border-line">
      <div className="mx-auto max-w-site px-5 sm:px-8 py-4 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs text-ink-faint">
        <p className="font-mono">{es ? "Snap Track — rastreo NFC, próximamente." : "Snap Track — NFC tracking, coming soon."}</p>
        {status === "done" ? (
          <p className="text-ok">{es ? "¡Listo! Te avisaremos." : "You're on the list — we'll let you know."}</p>
        ) : (
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={es ? "Tu correo" : "Your email"}
              className="rounded-full border border-line-strong bg-bg-raised px-3 py-1.5 text-xs text-ink w-40 sm:w-48"
            />
            <button type="submit" disabled={status === "sending"} className="rounded-full border border-line-strong px-3 py-1.5 text-xs text-ink hover:border-gold hover:text-gold disabled:opacity-50">
              {es ? "Avísame" : "Notify me"}
            </button>
          </form>
        )}
        {status === "error" && <p className="w-full text-center sm:w-auto text-red-700">{es ? "Algo salió mal. Intenta de nuevo." : "Something went wrong. Try again."}</p>}
      </div>
    </div>
  );
}

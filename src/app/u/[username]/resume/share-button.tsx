"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";

export function ShareResumeButton({ displayName, headline, shareUrl, locale }: { displayName: string; headline: string | null; shareUrl: string; locale: Locale }) {
  const es = locale === "es";
  const [copied, setCopied] = useState(false);

  async function share() {
    void fetch("/api/commerce-event", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ type: "resume_share" }) }).catch(() => undefined);
    const title = headline ? `${displayName} — ${headline}` : displayName;
    if (navigator.share) {
      try {
        // A flaky mobile share sheet can hang without ever resolving or rejecting — race it
        // against a timeout so the copy-link fallback still fires instead of leaving the
        // button stuck with no feedback.
        await Promise.race([
          navigator.share({ title, text: title, url: shareUrl }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("share timed out")), 4000)),
        ]);
        return;
      } catch { /* user cancelled, unsupported, or timed out — fall through to copy */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard unavailable — nothing else we can do without a backend redirect */ }
  }

  return (
    <button onClick={share} className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3.5 text-sm font-medium hover:border-gold hover:text-gold transition-colors w-full sm:w-auto">
      {copied ? (es ? "Enlace copiado" : "Link copied") : (es ? "Compartir currículum" : "Share Resume")}
    </button>
  );
}

"use client";
import { useState } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import { Glyph } from "@/components/primitives";
import Link from "next/link";

export function ContactSheet({ locale, username }: { locale: Locale; username: string }) {
  const t = getDict(locale);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "", company: "", consent: false });

  async function submit() {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, ...form }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || (locale === "es" ? "No pudimos enviar tu mensaje. Inténtalo de nuevo." : "We could not send your message. Please try again."));
        return;
      }
      setSent(true);
    } catch {
      setError(locale === "es" ? "No pudimos enviar tu mensaje. Inténtalo de nuevo." : "We could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-ok/40 bg-bg-raised px-5 py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-ok/15 text-ok grid place-items-center mx-auto mb-3">
          <Glyph.check className="w-5 h-5" />
        </div>
        <p className="font-medium">{t.profile.sent}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-full bg-ink text-bg py-3.5 font-medium text-sm hover:bg-gold transition-colors">
        {t.profile.connect}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-bg-raised p-5">
      <p className="font-display text-lg font-medium mb-4">{t.profile.sendYours}</p>
      <div className="flex flex-col gap-3">
        <Field placeholder={t.profile.yourName} value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field placeholder={t.profile.yourPhone} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
        <Field placeholder={t.profile.yourEmail} value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
        <textarea placeholder={t.profile.leaveMessage} value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3}
          className="rounded-lg border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-ink-faint resize-none focus:border-gold outline-none" />
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
        <label className="flex items-start gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} className="mt-0.5" />
          <span>I consent to sharing this information with the profile owner under the <Link href="/privacy" className="text-gold">Privacy Policy</Link>.</span>
        </label>
        {error && <p className="text-sm text-err">{error}</p>}
        <button onClick={submit} disabled={busy || !form.consent}
          className="rounded-full bg-ink text-bg py-3 font-medium text-sm hover:bg-gold transition-colors disabled:opacity-50">
          {busy ? "…" : t.profile.send}
        </button>
      </div>
    </div>
  );
}

function Field({ placeholder, value, onChange, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-bg px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-gold outline-none" />
  );
}

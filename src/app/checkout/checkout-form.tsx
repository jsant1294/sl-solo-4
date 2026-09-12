"use client";
import { useState } from "react";
import type { Locale } from "@/i18n/dict";
import { checkout } from "@/app/(shop)/cart-actions";
import { Glyph } from "@/components/primitives";

export function CheckoutForm({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [f, setF] = useState({ email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.email.includes("@");

  async function pay() {
    setBusy(true); setErr(null);
    try {
      const res = await checkout({ requestId, email: f.email, phone: f.phone || undefined });
      if (res.ok) window.location.href = res.url;
      else { setErr(res.error); setRequestId(crypto.randomUUID()); setBusy(false); }
    } catch { setErr("Secure checkout is temporarily unavailable"); setRequestId(crypto.randomUUID()); setBusy(false); }
  }

  const I = (k: keyof typeof f, label: string, type = "text", w = "") => (
    <label className={`block ${w}`}>
      <span className="text-xs text-ink-soft">{label}</span>
      <input type={type} value={f[k]} onChange={set(k)}
        className="mt-1 w-full rounded-lg border border-line bg-bg-raised px-3.5 py-2.5 text-sm text-ink focus:border-gold outline-none" />
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[0.7rem] uppercase tracking-widest text-gold mb-3">{es ? "Contacto" : "Contact"}</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {I("email", es ? "Correo" : "Email", "email")}
          {I("phone", es ? "Teléfono" : "Phone", "tel")}
        </div>
      </div>
      {err && <p className="text-sm text-err">{err}</p>}
      <button onClick={pay} disabled={busy || !valid}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink text-bg py-3.5 font-medium hover:bg-gold transition-colors disabled:opacity-40">
        {busy ? "…" : <>{es ? "Pagar ahora" : "Pay now"}<Glyph.arrow className="w-4 h-4" /></>}
      </button>
      <p className="text-xs text-ink-faint text-center">
        {es ? "Pago seguro con Stripe. Las opciones de envío aparecen en el pago." : "Secure checkout by Stripe. Shipping options appear at payment."}
      </p>
    </div>
  );
}

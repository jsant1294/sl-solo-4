"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDict, type Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { createProfile } from "../actions";
import { Glyph } from "@/components/primitives";
import type { ProfileType } from "@/lib/profile-data";
import { normalizeUsername } from "@/lib/username";

const TYPES = (locale: Locale) => [
  { type: "personal" as const, title: "Personal", desc: locale === "es" ? "Tu identidad digital." : "Your digital identity." },
  { type: "business" as const, title: "Business", desc: locale === "es" ? "Una presencia profesional simple." : "A simple professional presence." },
  { type: "kids" as const, title: "Kids", desc: locale === "es" ? "Una conexión segura para tu hijo." : "A safe contact connection for your child." },
];

const KIDS_ACCENTS = ["#E86FA6", "#5B8DEF", "#3FBF8F", "#F0A63C", "#9B6BDB"];

export function CreateFlow({ locale, next }: { locale: Locale; next?: string }) {
  const t = getDict(locale);
  const router = useRouter();
  const [type, setType] = useState<ProfileType | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [accent, setAccent] = useState(KIDS_ACCENTS[0]);
  const [busy, setBusy] = useState(false);

  const nameLabel = type === "kids"
    ? (locale === "es" ? "Nombre del niño (solo nombre)" : "Child's first name only")
    : type === "business"
    ? (locale === "es" ? "Nombre del negocio" : "Business name")
    : (locale === "es" ? "Tu nombre" : "Your name");

  async function create() {
    if (!type || !name.trim() || normalizeUsername(username).length < 3) return;
    setBusy(true);
    const res = await createProfile(type, name.trim(), normalizeUsername(username), type === "kids" ? accent : undefined);
    // `next` was already validated server-side (safeAppRedirect, see /app/create/page.tsx) —
    // e.g. hardware activation sends the customer here when they have no profile yet, then
    // wants them back at /activate?device=... afterward instead of the normal profile editor.
    if (res.ok) router.push(next ? withLang(next, locale) : withLang(`/app/profiles/${res.profileId}`, locale));
    else { setBusy(false); alert(res.error); }
  }

  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-3">
        {TYPES(locale).map((o) => (
          <button key={o.type} onClick={() => setType(o.type)}
            className={`text-left rounded-xl border p-6 transition-all ${
              type === o.type ? "border-gold bg-gold/5 shadow-sm" : "border-line bg-bg-raised hover:border-line-strong"}`}>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold">{o.title}</p>
            <p className="text-sm text-ink-soft mt-2">{o.desc}</p>
          </button>
        ))}
      </div>

      {type && (
        <div className="mt-8 max-w-md rise">
          {type === "kids" && (
            <div className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 mb-4 text-sm text-ink-soft">
              {locale === "es"
                ? "Por seguridad: usa solo el primer nombre. No agregues dirección, escuela ni cumpleaños."
                : "For safety: first name only. Never add home address, school, or birthday."}
            </div>
          )}
          <label className="block">
            <span className="text-sm text-ink-soft">{nameLabel}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              className="mt-1.5 w-full rounded-lg border border-line bg-bg-raised px-4 py-3 text-ink focus:border-gold outline-none" />
          </label>
          {type === "kids" && (
            <div className="mt-4">
              <span className="text-sm text-ink-soft">{locale === "es" ? "Color de acento" : "Accent color"}</span>
              <div className="mt-1.5 flex gap-2.5">
                {KIDS_ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => setAccent(c)} aria-label={c}
                    className={`h-9 w-9 rounded-full transition-transform ${accent === c ? "ring-2 ring-offset-2 ring-offset-bg ring-ink scale-110" : "hover:scale-105"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          )}
          <label className="mt-4 block">
            <span className="text-sm text-ink-soft">{locale === "es" ? "Nombre de usuario" : "Username"}</span>
            <div className="mt-1.5 flex items-center rounded-lg border border-line bg-bg-raised focus-within:border-gold">
              <span className="pl-4 text-sm text-ink-faint">/u/</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoCapitalize="none" spellCheck={false}
                className="w-full bg-transparent px-1 py-3 pr-4 font-mono text-sm outline-none" />
            </div>
          </label>
          <button onClick={create} disabled={busy || !name.trim() || normalizeUsername(username).length < 3}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink text-bg px-6 py-3 font-medium hover:bg-gold transition-colors disabled:opacity-40">
            {busy ? "…" : <>{locale === "es" ? "Crear" : "Create"}<Glyph.arrow className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState } from "react";
import Link from "next/link";
import { getDict, type Locale } from "@/i18n/dict";
import type { KidsData } from "@/lib/profile-data";
import type { Profile } from "@/db/schema";
import type { StoredContactChannel } from "@/lib/profile-data";
import { publicContactActions, resolvePrimaryAction } from "@/lib/contact-channels";
import { ContactOrb } from "@/components/contact-orb";
import { canonicalProfileUrl } from "@/lib/profile-sharing";
import { Glyph } from "@/components/primitives";
import { withLang } from "@/i18n/util";

/**
 * KidsProfile — the public page a stranger sees on tap/scan.
 * SAFETY CONTRACT (enforced here + upstream):
 *  - first name only, no full name (validated in profile-data)
 *  - monogram by default; photo only if guardian opted in
 *  - guardian phone numbers are NOT in initial HTML — revealed on tap
 *  - emergency info collapsed, opt-in, not shown until expanded
 *  - page is noindex (set on the route)
 * A stranger must grasp in seconds: who, why, who to call, what to do.
 */
export function KidsProfile({
  profile, data, contactChannels, accent, username, locale,
}: { profile: Profile; data: KidsData; contactChannels: StoredContactChannel[]; accent: string | null; username: string; locale: Locale }) {
  const t = getDict(locale);
  const a = accent ?? "#E86FA6";
  const initial = data.firstName.charAt(0).toUpperCase();
  const guardians = [...data.guardians].sort((x, y) => x.priority - y.priority);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const actions = publicContactActions(profile, contactChannels, "", locale);
  const primary = resolvePrimaryAction(profile, actions);

  return (
    <main className="min-h-screen bg-bg text-ink grid place-items-start sm:place-items-center">
      <div className="w-full max-w-[440px] mx-auto px-5 py-10">
        {/* identity */}
        <div className="text-center">
          <div className="w-28 h-28 rounded-full mx-auto grid place-items-center font-display text-4xl text-white shadow-md"
            style={{ background: `radial-gradient(120% 120% at 30% 20%, ${a}, ${a}cc)` }}>
            {data.usePhoto ? initial /* @wire real avatar only if opted-in */ : initial}
          </div>
          <h1 className="font-display text-3xl font-semibold mt-5">{data.firstName}</h1>
          {data.helpMessage && (
            <p className="text-ink-soft mt-3 leading-relaxed text-[1.05rem] max-w-[34ch] mx-auto">
              {data.helpMessage}
            </p>
          )}
        </div>

        {/* guardian actions — the primary thing on the page */}
        <div className="mt-9 flex flex-col gap-3">
          {guardians.map((g) => (
            <GuardianButton key={g.priority} label={g.label} name={g.name}
              relationship={g.relationship} priority={g.priority} username={username} accent={a} locale={locale} />
          ))}
        </div>

        {/* emergency — collapsed, opt-in, not in source until opened */}
        {data.emergency?.enabled && (
          <div className="mt-6 rounded-xl border border-line bg-bg-raised overflow-hidden">
            <button onClick={() => setEmergencyOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left">
              <span className="text-sm font-medium text-ink-soft">
                {locale === "es" ? "Información de emergencia" : "Emergency information"}
              </span>
              <span className={`text-ink-faint transition-transform ${emergencyOpen ? "rotate-90" : ""}`}>
                <Glyph.arrow className="w-4 h-4" />
              </span>
            </button>
            {emergencyOpen && (
              <div className="px-5 pb-5 flex flex-col gap-3 border-t border-line pt-4">
                {data.emergency.allergies && <EmRow label={locale === "es" ? "Alergias" : "Allergies"} v={data.emergency.allergies} />}
                {data.emergency.medical && <EmRow label={locale === "es" ? "Médico" : "Medical"} v={data.emergency.medical} />}
                {data.emergency.note && <EmRow label={locale === "es" ? "Nota" : "Note"} v={data.emergency.note} />}
              </div>
            )}
          </div>
        )}

        {/* trust footer */}
        <div className="mt-10 text-center">
          <Link href="/" className="inline-flex items-baseline gap-2 no-underline opacity-60 hover:opacity-100 transition-opacity">
            <span className="font-display text-sm font-semibold text-ink">{locale === "es" ? "Con tecnología de SnapLink" : "Powered by SnapLink"}</span>
          </Link>
          <Link href={withLang("/hardware", locale)} className="mt-2 block font-mono text-[0.65rem] uppercase tracking-[0.15em] text-gold no-underline hover:underline">
            {locale === "es" ? "Consigue tu SnapLink →" : "Get your SnapLink →"}
          </Link>
        </div>
      </div>
      <ContactOrb username={username} actions={actions} primary={primary} shareTitle="SnapLink Protect" shareDescription={locale === "es" ? "Toca para conectar de forma segura." : "Tap to connect safely."} shareUrl={canonicalProfileUrl(username)} locale={locale} />
    </main>
  );
}

function GuardianButton({
  label, name, relationship, priority, username, accent, locale,
}: {
  label: string; name: string; relationship?: string; priority: number;
  username: string; accent: string; locale: Locale;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const callWord = locale === "es" ? "Llamar a" : "Call";

  async function reveal() {
    if (phone) { window.location.href = `tel:${phone}`; return; }
    setLoading(true);
    try {
      const res = await fetch("/api/kids/reveal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, priority }),
      });
      const d = await res.json();
      if (d.phone) { setPhone(d.phone); window.location.href = `tel:${d.phone}`; }
    } finally { setLoading(false); }
  }

  return (
    <button onClick={reveal} disabled={loading}
      className="flex items-center justify-between rounded-2xl px-6 py-5 text-white text-left shadow-sm transition-transform active:scale-[0.99]"
      style={{ background: accent }}>
      <span>
        <span className="block text-lg font-semibold">{callWord} {label}</span>
        <span className="block text-sm opacity-90">{name}{relationship ? ` · ${relationship}` : ""}</span>
      </span>
      <span className="w-11 h-11 rounded-full bg-white/20 grid place-items-center">
        {loading ? "…" : <PhoneGlyph />}
      </span>
    </button>
  );
}

function EmRow({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="text-ink text-sm mt-0.5">{v}</p>
    </div>
  );
}

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden>
      <path d="M6.5 3h3l1.5 5-2 1.5a12 12 0 0 0 5 5l1.5-2 5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5a2 2 0 0 1 2-2Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

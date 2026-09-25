"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDict, type Locale } from "@/i18n/dict";
import { withLang } from "@/i18n/util";
import { Glyph } from "@/components/primitives";
import { claimDevice } from "./claim-actions";

type Step = "code" | "choose" | "test" | "success";

type ActivationProfile = { id: string; displayName: string; username: string };

export function ActivationFlow({ locale, profiles, devices, initialCode }: { locale: Locale; profiles: ActivationProfile[]; devices: { code: string; status: string; label: string }[]; initialCode?: string }) {
  const t = getDict(locale);
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  // Prefilled only as a convenience (e.g. arriving from a device's own /t/{code} tap or the
  // My Hardware "Activate" button) so the customer doesn't retype a code the system already
  // associates with their account — claimDevice() independently re-verifies ownership/status
  // server-side regardless of what code is submitted, so this is never trusted as-is.
  const [code, setCode] = useState(initialCode ? initialCode.toUpperCase() : "");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [tapped, setTapped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const chosen = profiles.find((p) => p.id === profileId);
  const steps: Step[] = ["code", "choose", "test", "success"];
  const idx = steps.indexOf(step);
  const remaining = devices.filter((d) => d.status === "assigned" && d.code !== code);

  return (
    <div>
      {/* progress rail */}
      <div className="flex gap-1.5 mb-8">
        {steps.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? "bg-gold" : "bg-line"}`} />
        ))}
      </div>

      {step === "code" && (
        <Card>
          <Label>{t.activate.code}</Label>
          {devices.length > 0 && <div className="mb-4 grid gap-2">{devices.map((device) => <button key={device.code} disabled={device.status !== "assigned"} onClick={() => setCode(device.code)} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-xs disabled:opacity-50"><span>{device.label}</span><span className="font-mono uppercase">{device.status === "assigned" ? "Ready to activate" : device.status === "paired" ? "Activated" : "Unavailable"}</span></button>)}</div>}
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SL-XXXX-XXXX" autoCapitalize="characters"
            className="w-full rounded-lg border border-line bg-bg px-4 py-4 text-center font-mono text-lg tracking-widest text-ink focus:border-gold outline-none" />
          <button onClick={() => { setError(""); setStep("choose"); }} disabled={code.trim().length < 4 || profiles.length === 0}
            className="btn-primary">{t.activate.pair}</button>
          {profiles.length === 0 && <p className="mt-3 text-center text-sm text-err">Create a profile before activating hardware.</p>}
          <p className="text-xs text-ink-faint text-center mt-4">{t.activate.qrFallback}</p>
          <QrFallback />
        </Card>
      )}

      {step === "choose" && (
        <Card>
          <Label>{t.activate.choose}</Label>
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <button key={p.id} onClick={() => setProfileId(p.id)}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  profileId === p.id ? "border-gold bg-gold/5" : "border-line hover:border-line-strong"}`}>
                <span className="w-10 h-10 rounded-full bg-bg-sunken grid place-items-center font-display text-gold text-sm">
                  {p.displayName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink">{p.displayName}</span>
                  <span className="block text-xs text-ink-faint font-mono">/u/{p.username}</span>
                </span>
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-center text-sm text-err">{error}</p>}
          <button disabled={busy || !profileId} onClick={async () => {
            setBusy(true); setError("");
            const result = await claimDevice(code, profileId);
            setBusy(false);
            if (result.ok) setStep("test"); else setError(result.error);
          }} className="btn-primary">{busy ? "…" : t.activate.pair}</button>
        </Card>
      )}

      {step === "test" && (
        <Card>
          <Label>{t.activate.test}</Label>
          <p className="text-sm text-ink-soft text-center mb-6">{t.activate.testBody}</p>
          <button onClick={() => { setTapped(true); setTimeout(() => setStep("success"), 700); }}
            className="mx-auto w-28 h-28 rounded-full border-2 border-gold text-gold grid place-items-center hover:bg-gold/10 transition-colors">
            <Glyph.tap className={`w-12 h-12 ${tapped ? "scale-90" : ""} transition-transform`} />
          </button>
          <button onClick={() => setStep("success")} className="btn-ghost mt-6">{t.activate.simulate}</button>
        </Card>
      )}

      {step === "success" && (
        <Card>
          <div className="w-16 h-16 rounded-full bg-ok/15 text-ok grid place-items-center mx-auto">
            <Glyph.check className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-center mt-5">{t.activate.success}</h2>
          <p className="text-ink-soft text-center mt-2">{t.activate.successBody}</p>
          {remaining.length > 0 && (
            <p className="text-sm text-gold text-center mt-4">
              {locale === "es"
                ? `Te queda${remaining.length > 1 ? "n" : ""} ${remaining.length} pieza${remaining.length > 1 ? "s" : ""} de tu kit por activar — todas al mismo perfil.`
                : `${remaining.length} more piece${remaining.length > 1 ? "s" : ""} from your kit to activate — claim them all to the same profile.`}
            </p>
          )}
          <button disabled={!chosen} onClick={() => chosen && router.push(withLang(`/u/${chosen.username}`, locale))} className="btn-primary mt-6">
            {t.activate.viewProfile}
          </button>
          {remaining.length > 0 && (
            <button onClick={() => { setCode(""); setStep("code"); setTapped(false); }} className="btn-ghost mt-3">
              {locale === "es" ? "Activar la siguiente pieza" : "Activate the next piece"}
            </button>
          )}
          <button onClick={() => router.push(withLang("/app", locale))} className="btn-ghost mt-3">{t.app.home}</button>
        </Card>
      )}

      <style>{`
        .btn-primary{width:100%;margin-top:1.25rem;border-radius:999px;background:hsl(var(--ink));color:hsl(var(--bg));padding:0.9rem;font-weight:500;transition:background var(--dur) var(--ease);}
        .btn-primary:hover{background:hsl(var(--gold));}
        .btn-primary:disabled{opacity:.4;pointer-events:none;}
        .btn-ghost{display:block;width:100%;text-align:center;color:hsl(var(--ink-soft));font-size:.875rem;}
        .btn-ghost:hover{color:hsl(var(--ink));}
      `}</style>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-bg-raised p-6 rise">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold mb-4 text-center">{children}</p>;
}

/* decorative QR placeholder — @wire render device-specific QR */
function QrFallback() {
  return (
    <div className="mt-4 mx-auto w-24 h-24 rounded-md border border-line grid grid-cols-5 gap-0.5 p-2 opacity-50">
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={i} className={`rounded-[1px] ${[0,1,2,4,5,6,10,12,14,18,20,22,24].includes(i) ? "bg-ink" : ""}`} />
      ))}
    </div>
  );
}

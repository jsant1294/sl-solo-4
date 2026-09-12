"use client";
import { useState, useEffect, useRef } from "react";
import { getDict, type Locale } from "@/i18n/dict";
import { normalizeUsername } from "@/lib/username";
import { Glyph } from "@/components/primitives";
import { beginJoin } from "./actions";

type Status = "idle" | "checking" | "available" | "taken" | "reserved" | "too_short" | "invalid" | "too_long";

export function JoinForm({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const norm = normalizeUsername(username);

  useEffect(() => {
    if (!norm) { setStatus("idle"); return; }
    setStatus("checking");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username?u=${encodeURIComponent(norm)}`);
        const data = await res.json();
        if (data.available) setStatus("available");
        else setStatus((data.reason as Status) ?? "taken");
      } catch { setStatus("idle"); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [norm]);

  const statusText: Record<Status, string> = {
    idle: "", checking: t.join.checking, available: t.join.available,
    taken: t.join.taken, reserved: t.join.reserved, too_short: t.join.tooShort,
    invalid: t.join.invalid, too_long: t.join.taken,
  };
  const statusColor = status === "available" ? "text-ok"
    : status === "checking" ? "text-ink-faint" : "text-err";

  const canContinue = status === "available" && email.includes("@") && name.length > 0;

  async function submit() {
    if (!canContinue || busy) return;
    setBusy(true); setError("");
    const result = await beginJoin({ name, email, username: norm, locale });
    setBusy(false);
    setError(result.error === "taken" ? t.join.taken : result.error);
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="block">
        <span className="text-sm text-ink-soft">{t.join.name}</span>
        <input value={name} onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg-raised px-4 py-3 text-ink focus:border-gold outline-none" />
      </label>

      <label className="block">
        <span className="text-sm text-ink-soft">{t.join.email}</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-bg-raised px-4 py-3 text-ink focus:border-gold outline-none" />
      </label>

      <label className="block">
        <span className="text-sm text-ink-soft">{t.join.username}</span>
        <div className="mt-1.5 flex items-center rounded-lg border border-line bg-bg-raised focus-within:border-gold overflow-hidden">
          <span className="pl-4 pr-1 text-ink-faint font-mono text-sm select-none">/u/</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false}
            className="flex-1 bg-transparent py-3 pr-4 text-ink outline-none font-mono text-sm" />
          {status === "available" && <Glyph.check className="w-5 h-5 text-ok mr-4" />}
        </div>
        <div className="mt-1.5 h-5 flex items-center gap-1.5">
          {status !== "idle" && <span className={`text-xs ${statusColor}`}>{statusText[status]}</span>}
          {status === "idle" && <span className="text-xs text-ink-faint">{t.join.usernameHint}</span>}
        </div>
      </label>

      {error && <p role="alert" className="text-sm text-err">{error}</p>}
      <button onClick={submit} disabled={!canContinue || busy}
        className="mt-2 rounded-full bg-ink text-bg py-3.5 font-medium hover:bg-gold transition-colors disabled:opacity-40 disabled:pointer-events-none">
        {busy ? "…" : t.join.continue}
      </button>
    </div>
  );
}

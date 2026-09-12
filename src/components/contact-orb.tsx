"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicContactAction } from "@/lib/contact-channels";
import { contactEventType } from "@/lib/contact-channels";
import { getDict, type Locale } from "@/i18n/dict";

export function ContactOrb({ username, actions, primary, shareTitle, shareDescription, shareUrl, locale = "en" }: {
  username: string; actions: PublicContactAction[]; primary: PublicContactAction;
  shareTitle: string; shareDescription: string; shareUrl: string; locale?: Locale;
}) {
  const t = getDict(locale).contact;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  function track(event: string) {
    void fetch("/api/profile-event", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ username, event }) });
  }
  async function share() {
    track("profile_shared");
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, text: shareDescription, url: shareUrl }); return; } catch { return; }
    }
    await navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  async function activate(action: PublicContactAction) {
    if (action.type === "share") { void share(); return; }
    track(contactEventType(action.type));
    if (action.guardian) {
      const response = await fetch("/api/kids/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, priority: 1 }) });
      if (!response.ok) return;
      const result = await response.json() as { phone?: string };
      if (!result.phone) return;
      const digits = result.phone.replace(/\D/g, "");
      window.location.href = action.type === "call" ? `tel:${result.phone}` : action.type === "sms" ? `sms:${result.phone}` : `https://wa.me/${digits}`;
      return;
    }
    if (action.href) window.location.href = action.href;
  }

  return <div className="fixed z-40 right-4 sm:right-6 flex flex-col items-end gap-2" style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}>
    {open && <div ref={panel} role="dialog" aria-label={t.dialogLabel} className="mb-1 w-[min(19rem,calc(100vw-2rem))] max-h-[min(27rem,65vh)] overflow-y-auto rounded-2xl border border-line bg-bg-raised/95 p-2 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 py-1"><p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">{t.orbTitle}</p><button onClick={() => setOpen(false)} aria-label={t.close} className="h-11 w-11 rounded-full hover:bg-bg-sunken">×</button></div>
      <div className="grid grid-cols-2 gap-1">
        {actions.map((action) => action.type === "share" || action.guardian ?
          <button key={action.type} onClick={() => void activate(action)} className="min-h-12 rounded-xl px-3 py-3 text-left text-sm font-medium hover:bg-bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><ChannelIcon type={action.type}/>{action.type === "share" && copied ? t.linkCopied : action.label}</button>
          : <a key={action.type} href={action.href ?? "#"} onClick={() => track(contactEventType(action.type))} className="min-h-12 rounded-xl px-3 py-3 text-sm font-medium text-ink no-underline hover:bg-bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><ChannelIcon type={action.type}/>{action.label}</a>)}
      </div>
    </div>}
    <div className="flex items-center gap-2">
      <button onClick={() => void activate(primary)} aria-label={`${primary.label}, primary contact action`} className="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-bg shadow-lg hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"><span className="inline-flex items-center gap-2"><ChannelIcon type={primary.type}/>{primary.label}</span></button>
      <button onClick={() => { const next = !open; setOpen(next); if (next) track("contact_orb_opened"); }} aria-expanded={open} aria-label={t.more} className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-bg-raised text-ink shadow-lg hover:border-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"><DotsIcon/></button>
    </div>
  </div>;
}

function ChannelIcon({ type }: { type: PublicContactAction["type"] }) {
  const paths: Record<string, React.ReactNode> = {
    call: <path d="M7 3 4.5 5.5c.8 6.5 5.5 11.2 12 12L19 15l-4-2-1.5 2c-2.2-.9-3.6-2.3-4.5-4.5L11 9 9 5Z"/>,
    sms: <path d="M4 5h16v11H9l-5 4Z"/>, email: <><path d="M3 5h18v14H3Z"/><path d="m3 6 9 7 9-7"/></>,
    vcard: <><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2"/><path d="M8 16c1-3 7-3 8 0"/></>,
    share: <><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 inline h-4 w-4 align-[-0.18em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[type] ?? <><circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/></>}</svg>;
}
function DotsIcon() { return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>; }

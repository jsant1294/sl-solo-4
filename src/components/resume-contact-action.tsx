"use client";

export function ResumeContactAction({ href, label }: { href: string; label: string }) {
  return (
    <a href={href}
      onClick={() => { void fetch("/api/commerce-event", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ type: "resume_contact_click" }) }).catch(() => undefined); }}
      className="rounded-full border border-line-strong px-4 py-2.5 text-sm font-medium text-ink no-underline hover:border-gold hover:text-gold transition-colors">
      {label}
    </a>
  );
}

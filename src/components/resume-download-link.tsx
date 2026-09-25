"use client";

export function DownloadResumeLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      onClick={() => { void fetch("/api/commerce-event", { method: "POST", headers: { "content-type": "application/json" }, keepalive: true, body: JSON.stringify({ type: "resume_download" }) }).catch(() => undefined); }}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink text-bg px-6 py-3.5 text-sm font-medium no-underline hover:bg-gold transition-colors w-full sm:w-auto">
      {label}
    </a>
  );
}

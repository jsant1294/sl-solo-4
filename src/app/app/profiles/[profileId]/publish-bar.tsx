"use client";
import { getDict, type Locale } from "@/i18n/dict";

export function PublishBar({
  locale, status, onChange, username, type, token,
}: {
  locale: Locale; status: "draft" | "active" | "disabled";
  onChange: (s: "draft" | "active" | "disabled") => void;
  username: string; type: string; token: string;
}) {
  const t = getDict(locale);
  const publicHref = type === "kids" ? `/d/${token}` : `/u/${username}`;

  const label = {
    draft: locale === "es" ? "Borrador" : "Draft",
    active: locale === "es" ? "Activo" : "Active",
    disabled: locale === "es" ? "Desactivado" : "Disabled",
  }[status];
  const dot = status === "active" ? "bg-ok" : status === "draft" ? "bg-warn" : "bg-ink-faint";

  return (
    <div className="fixed bottom-16 sm:bottom-0 inset-x-0 z-20 border-t border-line bg-bg/95 backdrop-blur-md">
      <div className="mx-auto max-w-3xl px-5 sm:pl-24 py-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-ink-soft">{label}</span>
        </span>
        <div className="flex items-center gap-2">
          {status === "active" && (
            <a href={publicHref} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-line-strong px-4 py-2 text-xs font-medium no-underline text-ink hover:border-gold hover:text-gold transition-colors">
              {locale === "es" ? "Ver público" : "View public"}
            </a>
          )}
          {status !== "active" ? (
            <button onClick={() => onChange("active")}
              className="rounded-full bg-ink text-bg px-6 py-2 text-sm font-medium hover:bg-gold transition-colors">
              {locale === "es" ? "Activar" : "Activate"}
            </button>
          ) : (
            <button onClick={() => onChange("disabled")}
              className="rounded-full border border-line-strong px-5 py-2 text-xs font-medium hover:border-err hover:text-err transition-colors">
              {locale === "es" ? "Desactivar" : "Disable"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { localeFrom, withLang } from "@/i18n/util";
import { repo } from "@/db/repo";
import { db } from "@/db";
import { getNetworkingPageAccess } from "./actions";
export const dynamic = "force-dynamic";

type Filter = "today" | "week" | "followup" | undefined;

export default async function Networking({ searchParams }: { searchParams: Promise<{ lang?: string; q?: string; filter?: string }> }) {
  const { lang, q, filter } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";
  const L = (h: string) => withLang(h, locale);

  const access = await getNetworkingPageAccess();
  if (!access.ok) return <NetworkingUpsell locale={locale} reason={access.reason} />;
  if (db) { try { await repo.commerce.record({ type: "networking_opened", sessionKey: access.userId }); } catch { /* analytics must never break the page */ } }

  const activeFilter: Filter = filter === "today" || filter === "week" || filter === "followup" ? filter : undefined;
  const leads = await repo.networkingLeads.listByUser(access.userId, { query: q, filter: activeFilter });

  const filters: { key: Filter; label: string }[] = [
    { key: undefined, label: es ? "Todos" : "All" },
    { key: "today", label: es ? "Hoy" : "Today" },
    { key: "week", label: es ? "Esta semana" : "This week" },
    ...(access.settings.followUpEnabled ? [{ key: "followup" as Filter, label: es ? "Necesita seguimiento" : "Needs follow-up" }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-semibold">{es ? "Networking" : "Networking"}</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {access.settings.cardScannerEnabled && (
          <Link href={L("/app/networking/scan")} className="inline-flex items-center justify-center gap-2 rounded-full bg-ink text-bg px-6 py-3.5 text-sm font-medium no-underline hover:bg-gold transition-colors flex-1 sm:flex-none">
            {es ? "Escanear tarjeta" : "Scan a Business Card"}
          </Link>
        )}
        {access.settings.manualConnectionsEnabled && (
          <Link href={L("/app/networking/new")} className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-6 py-3.5 text-sm no-underline hover:border-gold transition-colors flex-1 sm:flex-none">
            {es ? "Agregar manualmente" : "Add Manually"}
          </Link>
        )}
      </div>

      <form className="mb-4" action={L("/app/networking")} method="get">
        {lang && <input type="hidden" name="lang" value={lang} />}
        <input name="q" defaultValue={q ?? ""} placeholder={es ? "Buscar por nombre, empresa, correo o teléfono" : "Search by name, company, email, or phone"}
          className="w-full rounded-full border border-line bg-bg-raised px-4 py-2.5 text-sm focus:border-gold outline-none" />
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((f) => (
          <Link key={f.label} href={L(`/app/networking${f.key ? `?filter=${f.key}` : ""}`)}
            className={`rounded-full border px-3.5 py-1.5 text-xs no-underline transition-colors ${activeFilter === f.key ? "border-gold text-gold" : "border-line text-ink-soft hover:border-line-strong"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-3">
        {leads.length === 0 && (
          <p className="text-sm text-ink-faint">{es ? "Aún no tienes contactos. Escanea una tarjeta o agrega uno manualmente." : "No connections yet. Scan a card or add one manually."}</p>
        )}
        {leads.map((lead) => (
          <Link key={lead.id} href={L(`/app/networking/${lead.id}`)} className="block rounded-xl border border-line bg-bg-raised p-4 no-underline text-ink hover:border-gold/60 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{lead.displayName}</p>
                {(lead.jobTitle || lead.company) && <p className="text-sm text-ink-soft">{[lead.jobTitle, lead.company].filter(Boolean).join(" · ")}</p>}
              </div>
              <time className="text-xs text-ink-faint shrink-0">{new Date(lead.createdAt).toLocaleDateString(locale)}</time>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
              <span className="rounded-full border border-line px-2 py-0.5">{lead.source === "business_card_scan" ? (es ? "Tarjeta escaneada" : "Business Card Scan") : (es ? "Manual" : "Manual")}</span>
              {lead.followUpAt && <span className="rounded-full border border-gold/40 text-gold px-2 py-0.5">{es ? "Seguimiento" : "Follow up"} {new Date(lead.followUpAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NetworkingUpsell({ locale, reason }: { locale: string; reason: "not_entitled" | "disabled" }) {
  const es = locale === "es";
  if (reason === "disabled") {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-display text-xl">{es ? "Networking no está disponible por ahora" : "Networking is unavailable right now"}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
      <p className="font-mono text-[0.65rem] uppercase tracking-widest text-gold mb-3">{es ? "SnapLink Networking Kit" : "SnapLink Networking Kit"}</p>
      <p className="font-display text-2xl">{es ? "Escanea tarjetas. Organiza tus contactos." : "Scan cards. Organize your connections."}</p>
      <p className="mt-3 text-sm text-ink-soft max-w-sm mx-auto">
        {es
          ? "El escáner de tarjetas y los contactos de networking están incluidos con el Kit de Networking SnapLink — sin cuota mensual."
          : "The business card scanner and networking connections are included with the SnapLink Networking Kit — no monthly fee."}
      </p>
      <Link href={withLang("/hardware/networking-kit", locale as "en" | "es")} className="inline-flex mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors">
        {es ? "Ver el Kit de Networking" : "See the Networking Kit"}
      </Link>
    </div>
  );
}

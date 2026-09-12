import { requireUserId } from "@/lib/auth";
import { repo } from "@/db/repo";
import { localeFrom } from "@/i18n/util";

export const dynamic = "force-dynamic";

export default async function MyLeads({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const userId = await requireUserId();
  const locale = localeFrom(await searchParams);
  const leads = await repo.leads.listByUser(userId);
  return <div>
    <h1 className="font-display text-3xl font-semibold">{locale === "es" ? "Contactos recibidos" : "Leads"}</h1>
    <p className="mt-2 text-sm text-ink-soft">{locale === "es" ? "Información compartida voluntariamente desde tus perfiles activos." : "Information people voluntarily shared from your active profiles."}</p>
    <div className="mt-6 grid gap-3">
      {leads.length === 0 && <p className="text-sm text-ink-faint">{locale === "es" ? "Aún no hay contactos." : "No leads yet."}</p>}
      {leads.map((lead) => <article key={lead.id} className="rounded-xl border border-line bg-bg-raised p-4">
        <div className="flex justify-between gap-3"><p className="font-medium">{lead.name || lead.email || lead.phone || "Contact"}</p><time className="text-xs text-ink-faint">{new Date(lead.createdAt).toLocaleDateString(locale)}</time></div>
        <p className="mt-1 text-xs font-mono text-gold">@{lead.profileUsername}</p>
        {lead.email && <p className="mt-2 text-sm">{lead.email}</p>}
        {lead.phone && <p className="text-sm">{lead.phone}</p>}
        {lead.message && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{lead.message}</p>}
      </article>)}
    </div>
  </div>;
}

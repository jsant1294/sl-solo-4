import Link from "next/link";
import { notFound } from "next/navigation";
import { localeFrom, withLang } from "@/i18n/util";
import { repo } from "@/db/repo";
import { getNetworkingPageAccess } from "../actions";
import { ConnectionForm } from "../connection-form";
import { NotesEditor, FollowUpControl, DeleteConnectionButton } from "../connection-detail-actions";
export const dynamic = "force-dynamic";

export default async function ConnectionDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";
  const L = (h: string) => withLang(h, locale);

  const access = await getNetworkingPageAccess();
  if (!access.ok) notFound();

  // Ownership is enforced inside repo.networkingLeads.byId (WHERE id AND userId) — a lead
  // belonging to another customer simply doesn't come back, so this 404s rather than leaks.
  const lead = await repo.networkingLeads.byId(id, access.userId);
  if (!lead) notFound();

  return (
    <div className="max-w-xl">
      <Link href={L("/app/networking")} className="text-sm text-ink-soft hover:text-gold no-underline">← {es ? "Networking" : "Networking"}</Link>

      <div className="mt-4 mb-6">
        <h1 className="font-display text-3xl font-semibold">{lead.displayName}</h1>
        {(lead.jobTitle || lead.company) && <p className="text-ink-soft mt-1">{[lead.jobTitle, lead.company].filter(Boolean).join(" · ")}</p>}
        <p className="text-xs text-ink-faint mt-2">
          {lead.source === "business_card_scan" ? (es ? "Tarjeta escaneada" : "Business Card Scan") : (es ? "Agregado manualmente" : "Added manually")}
          {" · "}{new Date(lead.createdAt).toLocaleDateString(locale)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {lead.phone && <a href={`tel:${lead.phone}`} className="rounded-full bg-ink text-bg px-4 py-2 text-sm no-underline hover:bg-gold transition-colors">{es ? "Llamar" : "Call"}</a>}
        {lead.phone && <a href={`sms:${lead.phone}`} className="rounded-full border border-line-strong px-4 py-2 text-sm no-underline hover:border-gold transition-colors">{es ? "Mensaje" : "Text"}</a>}
        {lead.email && <a href={`mailto:${lead.email}`} className="rounded-full border border-line-strong px-4 py-2 text-sm no-underline hover:border-gold transition-colors">{es ? "Correo" : "Email"}</a>}
        {lead.website && <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="rounded-full border border-line-strong px-4 py-2 text-sm no-underline hover:border-gold transition-colors">{es ? "Sitio web" : "Website"}</a>}
      </div>

      <div className="grid gap-6 mb-8">
        <NotesEditor id={lead.id} initialNotes={lead.notes ?? ""} locale={locale} />
        {access.settings.followUpEnabled && (
          <FollowUpControl id={lead.id} initialDate={lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0, 10) : null} locale={locale} />
        )}
      </div>

      <details className="mb-8">
        <summary className="cursor-pointer text-sm text-ink-soft hover:text-gold">{es ? "Editar detalles del contacto" : "Edit connection details"}</summary>
        <div className="mt-4">
          <ConnectionForm mode="edit" leadId={lead.id} locale={locale} initial={{
            firstName: lead.firstName ?? "", lastName: lead.lastName ?? "", displayName: lead.displayName,
            company: lead.company ?? "", jobTitle: lead.jobTitle ?? "", email: lead.email ?? "", phone: lead.phone ?? "",
            website: lead.website ?? "", addressLine: lead.addressLine ?? "", city: lead.city ?? "", region: lead.region ?? "",
            postalCode: lead.postalCode ?? "", country: lead.country ?? "", linkedinUrl: lead.linkedinUrl ?? "", notes: lead.notes ?? "",
          }} />
        </div>
      </details>

      <DeleteConnectionButton id={lead.id} locale={locale} />
    </div>
  );
}

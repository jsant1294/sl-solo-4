import { db } from "@/db";
import { repo } from "@/db/repo";
import { listDemoLeads } from "@/db/demo";
export const dynamic = "force-dynamic";

export default async function OperatorLeads() {
  const leads = db ? await repo.leads.list() : listDemoLeads();
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Leads</h1>
        <span className="text-xs text-ink-faint font-mono">{db ? "Neon-backed" : "Demo data"}</span>
      </div>
      {leads.length === 0 ? (
        <p className="text-sm text-ink-faint">No leads yet.</p>
      ) : (
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-sunken text-ink-faint">
              <tr>
                <th className="text-left font-medium px-4 py-3">Received</th>
                <th className="text-left font-medium px-4 py-3">Profile</th>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Email</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Phone</th>
                <th className="text-left font-medium px-4 py-3">Message</th>
                <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-line hover:bg-bg-raised align-top">
                  <td className="px-4 py-3 text-ink-soft whitespace-nowrap">{new Date(lead.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{lead.profileDisplayName ?? "—"}</span>
                    {lead.profileUsername && <span className="block text-xs text-ink-faint font-mono">@{lead.profileUsername}</span>}
                  </td>
                  <td className="px-4 py-3">{lead.name || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{lead.email || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">{lead.phone || "—"}</td>
                  <td className="px-4 py-3 max-w-xs text-ink-soft">{lead.message || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-ink-faint font-mono text-xs">{lead.source || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

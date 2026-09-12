import Link from "next/link";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
export const dynamic = "force-dynamic";

export default async function OperatorProfiles({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  await requireOperator();
  const rows = await repo.profiles.listAllForOperator();
  const { created } = await searchParams;
  const createdRow = created ? rows.find((r) => r.profile.id === created) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Profiles</h1>
        <Link href="/operator/profiles/new" className="rounded-full bg-ink text-bg px-5 py-2.5 text-sm font-medium no-underline hover:bg-gold transition-colors">New Profile</Link>
      </div>

      {createdRow && (
        <div className="mb-6 rounded-xl border border-ok/40 bg-ok/5 p-5">
          <p className="text-sm text-ok font-medium">Profile created successfully.</p>
          <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <p><span className="text-ink-faint">Display name</span> · {createdRow.profile.displayName}</p>
            <p><span className="text-ink-faint">Username</span> · @{createdRow.profile.username}</p>
            <p><span className="text-ink-faint">Owner email</span> · {createdRow.ownerEmail}</p>
            <p><span className="text-ink-faint">Public URL</span> · /u/{createdRow.profile.username}</p>
          </div>
          <a href={`/u/${createdRow.profile.username}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm text-gold hover:underline">View Profile →</a>
        </div>
      )}

      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-sunken text-ink-faint">
            <tr>
              <th className="text-left font-medium px-4 py-3">Display name</th>
              <th className="text-left font-medium px-4 py-3">Username</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Owner email</th>
              <th className="text-left font-medium px-4 py-3">Type</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ profile, ownerEmail }) => (
              <tr key={profile.id} className="border-t border-line hover:bg-bg-raised">
                <td className="px-4 py-3 font-medium">{profile.displayName}</td>
                <td className="px-4 py-3 font-mono">
                  <a href={`/u/${profile.username}`} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">@{profile.username}</a>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-ink-soft">{ownerEmail}</td>
                <td className="px-4 py-3 text-ink-soft capitalize">{profile.type}</td>
                <td className="px-4 py-3"><span className={profile.status === "active" ? "text-ok" : "text-ink-faint"}>{profile.status}</span></td>
                <td className="px-4 py-3 hidden sm:table-cell text-ink-faint font-mono text-xs">{profile.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-8 py-10 text-center text-ink-faint">No profiles yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

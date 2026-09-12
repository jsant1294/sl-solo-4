import Link from "next/link";
import { requireOperator } from "@/lib/operator";
import { createOperatorProfile } from "../actions";
export const dynamic = "force-dynamic";

const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function NewOperatorProfile({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOperator();
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <Link href="/operator/profiles" className="text-sm text-ink-soft hover:text-gold no-underline">← Profiles</Link>
      <h1 className="font-display text-2xl font-semibold tracking-tight mt-4 mb-6">New Profile</h1>

      {error && (
        <div className="mb-5 rounded-lg border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">{error}</div>
      )}

      <form action={createOperatorProfile} className="rounded-xl border border-line bg-bg-raised p-5 grid gap-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={label}>Owner email<input className={input} type="email" name="ownerEmail" required placeholder="owner@example.com"/></label>
          <label className={label}>Owner name<input className={input} name="ownerName" required placeholder="Jane Doe"/></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={label}>Display name<input className={input} name="displayName" required placeholder="Jane's Studio"/></label>
          <label className={label}>Username<div className="flex items-center rounded-md border border-line bg-bg px-3"><span className="text-sm text-ink-faint">/u/</span><input className="w-full bg-transparent px-1 py-2 font-mono text-sm outline-none" name="username" required placeholder="jane"/></div></label>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className={label}>Profile type<select className={input} name="type" defaultValue="personal"><option value="personal">Personal</option><option value="business">Business</option></select></label>
          <label className={label}>Locale<select className={input} name="locale" defaultValue="en"><option value="en">English</option><option value="es">Español</option></select></label>
          <label className={label}>Accent (optional)<input className={input} name="accent" placeholder="#B78A32"/></label>
        </div>
        <p className="text-xs text-ink-faint">Creates the owner account if it doesn&apos;t exist yet, or reuses an existing one by email. The profile starts as a draft and is not publicly visible until published.</p>
        <div className="flex items-center gap-3">
          <button className="rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors">Create Profile</button>
          <Link href="/operator/profiles" className="text-sm text-ink-soft hover:text-ink no-underline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

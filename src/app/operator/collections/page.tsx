import { repo } from "@/db/repo";
import { saveCollectionOption } from "./actions";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";
const patterns = ["pattern-signature", "pattern-color", "pattern-play", "pattern-kids"] as const;

export default async function CollectionsEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const collections = await repo.collections.list().catch(() => null);
  const saved = (await searchParams).saved;

  return <div className="pb-20">
    <div className="mb-8"><p className="font-mono text-xs uppercase tracking-widest text-gold">Style Discovery</p><h1 className="font-display text-3xl font-semibold mt-2">Collection cards</h1><p className="text-sm text-ink-faint mt-2 max-w-2xl">Edit the four collection cards on the &quot;Made for your personality&quot; section. Which product each card links to is matched automatically and isn&apos;t editable here.</p></div>
    {collections === null && <p className="text-sm text-warn">Migration not applied yet — run <code>npm run db:push</code>, then seed the four collection rows.</p>}
    {collections !== null && collections.length === 0 && <p className="text-sm text-ink-faint">No collection rows found — seed the four collections first.</p>}
    <div className="grid gap-5">{(collections ?? []).map((collection, index) => <details key={collection.id} open={index === 0 || saved === collection.id} className="group rounded-xl border border-line bg-bg-raised shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><span className="font-mono text-[0.65rem] uppercase tracking-widest text-gold">{String(index + 1).padStart(2, "0")} · {collection.key}</span><h2 className="font-display text-xl mt-1">{collection.titleEn}</h2></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs ${collection.active ? "bg-ok/10 text-ok" : "bg-bg-sunken text-ink-faint"}`}>{collection.active ? "Visible" : "Hidden"}</span><span className="text-ink-faint group-open:rotate-180">⌄</span></div></summary>
      <form action={saveCollectionOption} className="grid gap-6 border-t border-line p-5">
        <input type="hidden" name="id" value={collection.id}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={collection.active}/> Show this collection</label>
        <div className="grid md:grid-cols-2 gap-5">
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">EN</legend>
            <label className={label}>Card title<input className={input} name="titleEn" defaultValue={collection.titleEn} required/></label>
            <label className={label}>Card note<input className={input} name="noteEn" defaultValue={collection.noteEn} required/></label>
          </fieldset>
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">ES</legend>
            <label className={label}>Card title<input className={input} name="titleEs" defaultValue={collection.titleEs} required/></label>
            <label className={label}>Card note<input className={input} name="noteEs" defaultValue={collection.noteEs} required/></label>
          </fieldset>
        </div>
        <label className={label}>Swatch colors — hex codes, comma-separated<input className={input} name="colors" defaultValue={collection.colors.join(", ")}/></label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className={label}>Background pattern<select className={input} name="pattern" defaultValue={collection.pattern}>{patterns.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <label className={label}>Sort order<input className={input} type="number" name="sortOrder" defaultValue={collection.sortOrder} min={0}/></label>
        </div>
        <p className="text-xs text-ink-faint">Which real product this collection links to is matched automatically (Signature shows a real product photo; Kids matches a kids-type product) and isn&apos;t editable here — that logic lives in code so a typo can&apos;t silently break the link.</p>
        <div><button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Save collection</button>{saved === collection.id && <span className="ml-3 text-sm text-ok">Saved to Neon and storefront</span>}</div>
      </form>
    </details>)}</div>
  </div>;
}

import { repo } from "@/db/repo";
import { savePurposeOption } from "./actions";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const textarea = `${input} min-h-[84px]`;
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";
const colors = ["coral", "violet", "blue", "aqua", "green", "yellow"] as const;

export default async function PurposesEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOperator();
  const purposes = await repo.purposes.list().catch(() => null);
  const saved = (await searchParams).saved;

  return <div className="pb-20">
    <div className="mb-8"><p className="font-mono text-xs uppercase tracking-widest text-gold">Purpose Finder</p><h1 className="font-display text-3xl font-semibold mt-2">Purpose cards</h1><p className="text-sm text-ink-faint mt-2 max-w-2xl">Edit the six purpose cards and their modal content. Which real hardware each purpose recommends is matched automatically from product tags and isn&apos;t editable here.</p></div>
    {purposes === null && <p className="text-sm text-warn">Migration not applied yet — run <code>npm run db:push</code>, then seed the six purpose rows.</p>}
    {purposes !== null && purposes.length === 0 && <p className="text-sm text-ink-faint">No purpose rows found — seed the six purposes first.</p>}
    <div className="grid gap-5">{(purposes ?? []).map((purpose, index) => <details key={purpose.id} open={index === 0 || saved === purpose.id} className="group rounded-xl border border-line bg-bg-raised shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><span className="font-mono text-[0.65rem] uppercase tracking-widest text-gold">{String(index + 1).padStart(2, "0")} · {purpose.key}</span><h2 className="font-display text-xl mt-1">{purpose.titleEn}</h2></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs ${purpose.active ? "bg-ok/10 text-ok" : "bg-bg-sunken text-ink-faint"}`}>{purpose.active ? "Visible" : "Hidden"}</span><span className="text-ink-faint group-open:rotate-180">⌄</span></div></summary>
      <form action={savePurposeOption} className="grid gap-6 border-t border-line p-5">
        <input type="hidden" name="id" value={purpose.id}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={purpose.active}/> Show this purpose</label>
        <div className="grid md:grid-cols-2 gap-5">
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">EN</legend>
            <label className={label}>Card title<input className={input} name="titleEn" defaultValue={purpose.titleEn} required/></label>
            <label className={label}>Card tagline<input className={input} name="taglineEn" defaultValue={purpose.taglineEn} required/></label>
            <label className={label}>Modal headline<input className={input} name="headlineEn" defaultValue={purpose.headlineEn} required/></label>
            <label className={label}>Modal description<textarea className={textarea} name="descriptionEn" defaultValue={purpose.descriptionEn} required/></label>
            <label className={label}>Capability chips (comma-separated)<input className={input} name="chipsEn" defaultValue={purpose.chipsEn.join(", ")}/></label>
            {purpose.key === "kids" && <label className={label}>Privacy points — one per line, &quot;Title :: Body&quot;<textarea className={textarea} name="privacyPointsEn" defaultValue={(purpose.privacyPointsEn ?? []).map((p) => `${p.t} :: ${p.b}`).join("\n")}/></label>}
          </fieldset>
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">ES</legend>
            <label className={label}>Card title<input className={input} name="titleEs" defaultValue={purpose.titleEs} required/></label>
            <label className={label}>Card tagline<input className={input} name="taglineEs" defaultValue={purpose.taglineEs} required/></label>
            <label className={label}>Modal headline<input className={input} name="headlineEs" defaultValue={purpose.headlineEs} required/></label>
            <label className={label}>Modal description<textarea className={textarea} name="descriptionEs" defaultValue={purpose.descriptionEs} required/></label>
            <label className={label}>Capability chips (comma-separated)<input className={input} name="chipsEs" defaultValue={purpose.chipsEs.join(", ")}/></label>
            {purpose.key === "kids" && <label className={label}>Privacy points — one per line, &quot;Title :: Body&quot;<textarea className={textarea} name="privacyPointsEs" defaultValue={(purpose.privacyPointsEs ?? []).map((p) => `${p.t} :: ${p.b}`).join("\n")}/></label>}
          </fieldset>
        </div>
        {purpose.key === "kids" && <label className={label}>Character teaser (comma-separated names)<input className={input} name="characterTeaser" defaultValue={(purpose.characterTeaser ?? []).join(", ")}/></label>}
        <div className="grid sm:grid-cols-3 gap-4">
          <label className={label}>Accent color<select className={input} name="color" defaultValue={purpose.color}>{colors.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label className={label}>Secondary CTA destination<input className={input} name="secondaryHref" defaultValue={purpose.secondaryHref} placeholder="/hardware"/></label>
          <label className={label}>Sort order<input className={input} type="number" name="sortOrder" defaultValue={purpose.sortOrder} min={0}/></label>
        </div>
        <p className="text-xs text-ink-faint">Which real hardware this purpose recommends is matched automatically from product tags (profile type + priority order) and isn&apos;t editable here — that logic lives in code so a typo can&apos;t silently break recommendations.</p>
        <div><button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Save purpose</button>{saved === purpose.id && <span className="ml-3 text-sm text-ok">Saved to Neon and storefront</span>}</div>
      </form>
    </details>)}</div>
  </div>;
}

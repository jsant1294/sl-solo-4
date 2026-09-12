import { repo } from "@/db/repo";
import { savePricingPlan, createPricingPlan } from "./actions";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const textarea = `${input} min-h-[100px]`;
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";
const dollarsOf = (c: number | null) => c === null ? "" : (c / 100).toString();

export default async function PlansEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const plans = await repo.plans.list().catch(() => null);
  const saved = (await searchParams).saved;

  return <div className="pb-20">
    <div className="mb-8">
      <p className="font-mono text-xs uppercase tracking-widest text-gold">Monetization</p>
      <h1 className="font-display text-3xl font-semibold mt-2">Pricing plans</h1>
      <p className="text-sm text-ink-faint mt-2 max-w-2xl">
        Editing here changes price and feature copy only — no plan currently gates any feature
        of the product. <code>users.plan</code> stores whichever <code>key</code> a user is on
        (everyone defaults to <code>free</code>). See <code>docs/PLANS.md</code> before wiring an
        actual feature gate against this data.
      </p>
    </div>
    {plans === null && <p className="text-sm text-warn">Migration not applied yet — run <code>npm run db:push</code> (or apply the pending migration) first.</p>}
    {plans !== null && plans.length === 0 && <p className="text-sm text-ink-faint">No plans yet — add one below.</p>}

    <div className="grid gap-5">{(plans ?? []).map((plan, index) => <details key={plan.id} open={index === 0 || saved === plan.id} className="group rounded-xl border border-line bg-bg-raised shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div>
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-gold">{plan.key}</span>
          <h2 className="font-display text-xl mt-1">{plan.nameEn}{plan.highlighted && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-gold align-middle">Highlighted</span>}</h2>
          <p className="text-xs text-ink-faint mt-1">{plan.priceMonthlyCents === null ? "Not priced (contact us)" : `$${(plan.priceMonthlyCents / 100).toFixed(2)}/mo`}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-2.5 py-1 text-xs ${plan.active ? "bg-ok/10 text-ok" : "bg-bg-sunken text-ink-faint"}`}>{plan.active ? "Visible" : "Hidden"}</span>
          <span className="text-ink-faint group-open:rotate-180">⌄</span>
        </div>
      </summary>
      <form action={savePricingPlan} className="grid gap-6 border-t border-line p-5">
        <input type="hidden" name="id" value={plan.id}/>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={plan.active}/> Show on pricing page</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="highlighted" defaultChecked={plan.highlighted}/> Highlight as &quot;most popular&quot;</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <label className={label}>Key (matches <code>users.plan</code>)<input className={input} name="key" defaultValue={plan.key} required/></label>
          <label className={label}>Sort order<input className={input} type="number" name="sortOrder" defaultValue={plan.sortOrder} min={0}/></label>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">EN</legend>
            <label className={label}>Plan name<input className={input} name="nameEn" defaultValue={plan.nameEn} required/></label>
            <label className={label}>Tagline<input className={input} name="taglineEn" defaultValue={plan.taglineEn ?? ""}/></label>
            <label className={label}>Features — one per line<textarea className={textarea} name="featuresEn" defaultValue={plan.featuresEn.join("\n")}/></label>
          </fieldset>
          <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">ES</legend>
            <label className={label}>Plan name<input className={input} name="nameEs" defaultValue={plan.nameEs} required/></label>
            <label className={label}>Tagline<input className={input} name="taglineEs" defaultValue={plan.taglineEs ?? ""}/></label>
            <label className={label}>Features — one per line<textarea className={textarea} name="featuresEs" defaultValue={plan.featuresEs.join("\n")}/></label>
          </fieldset>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <label className={label}>Price / month (USD, blank = not priced)<input className={input} name="priceMonthly" defaultValue={dollarsOf(plan.priceMonthlyCents)} placeholder="6.00"/></label>
          <label className={label}>Price / year (USD, blank = not priced)<input className={input} name="priceYearly" defaultValue={dollarsOf(plan.priceYearlyCents)} placeholder="60.00"/></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <label className={label}>Stripe monthly price ID (leave blank until billing exists)<input className={input} name="stripePriceIdMonthly" defaultValue={plan.stripePriceIdMonthly ?? ""} placeholder="price_..."/></label>
          <label className={label}>Stripe yearly price ID<input className={input} name="stripePriceIdYearly" defaultValue={plan.stripePriceIdYearly ?? ""} placeholder="price_..."/></label>
        </div>
        <div><button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Save plan</button>{saved === plan.id && <span className="ml-3 text-sm text-ok">Saved</span>}</div>
      </form>
    </details>)}</div>

    <details className="group mt-8 rounded-xl border border-dashed border-line-strong p-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-ink-soft">+ Add a new tier</summary>
      <form action={createPricingPlan} className="mt-4 grid sm:grid-cols-3 gap-4">
        <label className={label}>Key<input className={input} name="key" placeholder="enterprise" required/></label>
        <label className={label}>Name (EN)<input className={input} name="nameEn" placeholder="Enterprise" required/></label>
        <label className={label}>Name (ES)<input className={input} name="nameEs" placeholder="Empresa" required/></label>
        <div className="sm:col-span-3"><button className="rounded-full border border-line px-5 py-2.5 text-sm">Create (hidden by default)</button></div>
      </form>
    </details>
  </div>;
}

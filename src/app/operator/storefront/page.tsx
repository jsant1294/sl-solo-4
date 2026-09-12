import Link from "next/link";
import { repo } from "@/db/repo";
import { saveStorefrontSection } from "./actions";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function StorefrontEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const [sections, media, products] = await Promise.all([repo.storefront.list(), repo.media.list(), repo.products.list(false)]);
  const saved = (await searchParams).saved;
  return <div className="pb-20">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8"><div><p className="font-mono text-xs uppercase tracking-widest text-gold">Public storefront</p><h1 className="font-display text-3xl font-semibold mt-2">Homepage CMS</h1><p className="text-sm text-ink-faint mt-2 max-w-2xl">Edit the approved SOLO funnel. Section order and visual structure remain protected in code.</p></div><div className="flex gap-3"><Link href="/operator/media" className="rounded-full border border-line-strong px-4 py-2 text-sm text-ink no-underline">Media library</Link><Link href="/" className="rounded-full bg-ink px-4 py-2 text-sm text-bg no-underline">View homepage</Link></div></div>
    <div className="grid gap-5">{sections.map((section, index) => <details key={section.id} open={index === 0 || saved === section.id} className="group rounded-xl border border-line bg-bg-raised shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><span className="font-mono text-[0.65rem] uppercase tracking-widest text-gold">{String(index + 1).padStart(2, "0")} · {section.key}</span><h2 className="font-display text-xl mt-1">{section.label}</h2></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs ${section.active ? "bg-ok/10 text-ok" : "bg-bg-sunken text-ink-faint"}`}>{section.active ? "Visible" : "Hidden"}</span><span className="text-ink-faint group-open:rotate-180">⌄</span></div></summary>
      <form action={saveStorefrontSection} className="grid gap-6 border-t border-line p-5">
        <input type="hidden" name="id" value={section.id}/>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={section.active}/> Show this section</label>
        <div className="grid md:grid-cols-2 gap-5"><LocaleFields locale="EN" suffix="En" section={section}/><LocaleFields locale="ES" suffix="Es" section={section}/></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className={label}>CTA destination<input className={input} name="ctaHref" defaultValue={section.ctaHref ?? ""} placeholder="/hardware or https://…"/></label>
          <label className={label}>Selected media<select className={input} name="mediaId" defaultValue={section.mediaId ?? ""}><option value="">Product/default media</option>{media.map((item) => <option key={item.id} value={item.id}>{item.kind} · {item.alt || item.url.split("/").pop()}</option>)}</select></label>
          <label className={label}>Featured product<select className={input} name="featuredProductId" defaultValue={section.featuredProductId ?? ""}><option value="">Automatic/default</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.active ? "visible" : "hidden"}</option>)}</select></label>
          <label className={label}>Collection reference<input className={input} name="featuredCollection" defaultValue={section.featuredCollection ?? ""} placeholder="signature, color, kids…"/></label>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 rounded-lg bg-bg-sunken p-4">
          <label className={label}>Background theme<select className={input} name="backgroundTheme" defaultValue={section.backgroundTheme}><option value="ivory">Ivory</option><option value="sand">Warm sand</option><option value="coral">Muted coral</option><option value="lavender">Lavender</option><option value="aqua">Soft aqua</option><option value="sage">Sage</option><option value="yellow">Pale yellow</option><option value="charcoal">Charcoal</option><option value="pattern">Pattern</option></select></label>
          <label className={label}>Mobile media<select className={input} name="mobileMediaId" defaultValue={section.mobileMediaId ?? ""}><option value="">Use desktop media</option>{media.map((item) => <option key={item.id} value={item.id}>{item.kind} · {item.alt || item.url.split("/").pop()}</option>)}</select></label>
          <label className={label}>Desktop focal point<input className={input} name="desktopPosition" defaultValue={section.desktopPosition} placeholder="50% 50%"/></label>
          <label className={label}>Mobile focal point<input className={input} name="mobilePosition" defaultValue={section.mobilePosition} placeholder="65% 50%"/></label>
          <label className={label}>Hero overlay: {section.overlayStrength}%<input className="w-full accent-ink" type="range" min="20" max="90" step="5" name="overlayStrength" defaultValue={section.overlayStrength}/></label>
        </div>
        {section.media && <div className="max-w-[180px] overflow-hidden rounded-lg border border-line">{section.media.kind === "video" ? <video src={section.media.url} className="aspect-[9/16] w-full object-cover" controls/> : <img src={section.media.url} alt={section.media.alt ?? ""} className="aspect-square w-full object-cover"/>}</div>}
        <div><button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Save section</button>{saved === section.id && <span className="ml-3 text-sm text-ok">Saved to Neon and storefront</span>}</div>
      </form>
    </details>)}</div>
  </div>;
}

function LocaleFields({ locale, suffix, section }: { locale: "EN" | "ES"; suffix: "En" | "Es"; section: Awaited<ReturnType<typeof repo.storefront.list>>[number] }) {
  return <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">{locale}</legend>
    <label className={label}>Eyebrow<input className={input} name={`eyebrow${suffix}`} defaultValue={section[`eyebrow${suffix}`] ?? ""}/></label>
    <label className={label}>Headline<input className={input} name={`headline${suffix}`} defaultValue={section[`headline${suffix}`]} required/></label>
    <label className={label}>Body<textarea rows={4} className={input} name={`body${suffix}`} defaultValue={section[`body${suffix}`] ?? ""}/></label>
    <label className={label}>CTA label<input className={input} name={`ctaLabel${suffix}`} defaultValue={section[`ctaLabel${suffix}`] ?? ""}/></label>
  </fieldset>;
}

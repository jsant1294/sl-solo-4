import { notFound } from "next/navigation";
import { repo } from "@/db/repo";
import { saveProduct, uploadProductMedia, removeProductMedia, arrangeProductMedia } from "../actions";
import { dollars } from "@/db/commerce-demo";

const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function ProductEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params; const product = await repo.products.byId(id); if (!product) notFound();
  const saved = (await searchParams).saved;
  const variants = product.variants.map((v) => [v.label, v.color, v.priceDelta, v.sku].map((x) => x ?? "").join(" | ")).join("\n");
  const media = [product.primaryImage, ...product.galleryImages, product.video, product.videoPoster].filter(Boolean);
  return <div className="pb-20">
    <div className="flex items-start justify-between gap-4 mb-8"><div><p className="text-xs font-mono uppercase tracking-widest text-gold">Hardware studio</p><h1 className="font-display text-3xl font-semibold mt-2">{product.name}</h1><p className="text-sm text-ink-faint mt-1">{dollars(product.basePrice)} · /hardware/{product.slug}</p></div>{saved && <span className="text-sm text-ok">Saved to storefront</span>}</div>
    <form action={saveProduct} className="grid lg:grid-cols-[1fr_300px] gap-8">
      <input type="hidden" name="id" value={product.id}/>
      <div className="grid gap-6">
        <section className="rounded-xl border border-line bg-bg-raised p-5 grid gap-4"><h2 className="font-display text-xl">Storefront copy</h2>
          <div className="grid sm:grid-cols-2 gap-4"><label className={label}>Name (EN)<input className={input} name="name" defaultValue={product.name} required/></label><label className={label}>Name (ES)<input className={input} name="nameEs" defaultValue={product.nameEs ?? ""}/></label></div>
          <label className={label}>Slug<input className={input} name="slug" defaultValue={product.slug} required/></label>
          <div className="grid sm:grid-cols-2 gap-4"><label className={label}>Short copy (EN)<textarea className={input} name="shortDescription" defaultValue={product.shortDescription ?? ""}/></label><label className={label}>Short copy (ES)<textarea className={input} name="shortDescriptionEs" defaultValue={product.shortDescriptionEs ?? ""}/></label></div>
          <div className="grid sm:grid-cols-2 gap-4"><label className={label}>Full copy (EN)<textarea rows={5} className={input} name="fullDescription" defaultValue={product.fullDescription ?? ""}/></label><label className={label}>Full copy (ES)<textarea rows={5} className={input} name="fullDescriptionEs" defaultValue={product.fullDescriptionEs ?? ""}/></label></div>
        </section>
        <section className="rounded-xl border border-line bg-bg-raised p-5 grid gap-4"><h2 className="font-display text-xl">Variants & personalization</h2>
          <label className={label}>Colors (comma separated)<input className={input} name="colors" defaultValue={product.colors.join(", ")}/></label>
          <label className={label}>Variants — one per line: label | color | price delta cents | SKU<textarea rows={6} className={`${input} font-mono`} name="variants" defaultValue={variants}/></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="personalizationAvailable" defaultChecked={product.personalizationAvailable}/> Personalization available</label>
          <label className={label}>Personalization options<input className={input} name="personalizationOptions" defaultValue={product.personalizationOptions.join(", ")}/></label>
          <label className={label}>Supported profile types<input className={input} name="profileTypesSupported" defaultValue={product.profileTypesSupported.join(", ")}/></label>
        </section>
        <section className="rounded-xl border border-line bg-bg-raised p-5 grid gap-4"><h2 className="font-display text-xl">Touchpoint Art (custom hardware add-on)</h2>
          <p className="text-xs text-ink-faint -mt-2">A paid custom-branded-artwork upsell — separate from the personalization string above. Customers see a checkbox + a design-request note field on the product page.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" name="customArtAvailable" defaultChecked={product.customArtAvailable}/> Offer custom Touchpoint Art for this product</label>
          <label className={label}>Custom art price (cents)<input className={input} type="number" name="customArtPriceCents" defaultValue={product.customArtPriceCents ?? ""} placeholder="4900"/></label>
        </section>
        <section className="rounded-xl border border-line bg-bg-raised p-5 grid gap-4"><h2 className="font-display text-xl">Instructions & SEO</h2>
          <label className={label}>Activation instructions<textarea className={input} name="activationInstructions" defaultValue={product.activationInstructions ?? ""}/></label>
          <label className={label}>Internal fulfillment notes<textarea className={input} name="fulfillmentNotes" defaultValue={product.fulfillmentNotes ?? ""}/></label>
          <label className={label}>SEO title<input className={input} name="seoTitle" defaultValue={product.seoTitle ?? ""}/></label><label className={label}>SEO description<textarea className={input} name="seoDescription" defaultValue={product.seoDescription ?? ""}/></label>
        </section>
      </div>
      <aside className="grid gap-5 content-start">
        <section className="rounded-xl border border-line bg-bg-raised p-5 grid gap-4"><h2 className="font-display text-xl">Publishing</h2><label className="flex gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product.active}/> Visible</label><label className="flex gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={product.featured}/> Featured</label><label className={label}>Price (cents)<input className={input} type="number" name="basePrice" defaultValue={product.basePrice}/></label><label className={label}>Compare price (cents)<input className={input} type="number" name="compareAtPrice" defaultValue={product.compareAtPrice ?? ""}/></label><label className={label}>Sort order<input className={input} type="number" name="sortOrder" defaultValue={product.sortOrder}/></label><button className="rounded-md bg-ink text-bg px-4 py-2.5 text-sm font-medium">Save product</button></section>
      </aside>
    </form>
    <section className="mt-8 rounded-xl border border-line bg-bg-raised p-5"><h2 className="font-display text-xl">Product media</h2><p className="text-sm text-ink-faint mt-1">Upload photos, a vertical campaign video, or its poster. Files are stored in Vercel Blob; metadata lives in Neon.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">{media.map((m) => m && <div key={m.id} className="border border-line rounded-lg overflow-hidden">{m.kind === "video" ? <video src={m.url} className="aspect-[9/16] w-full object-cover" controls/> : <img src={m.url} alt={m.alt ?? ""} className="aspect-square w-full object-cover" style={{ objectPosition: m.objectPosition }}/>}<div className="p-3 flex flex-wrap gap-3">{m.kind === "image" && <form action={arrangeProductMedia}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mediaId" value={m.id}/><button name="command" value="primary" className="text-xs text-gold">Make primary</button><button name="command" value="up" className="text-xs ml-2">↑</button><button name="command" value="down" className="text-xs ml-2">↓</button></form>}<form action={removeProductMedia}><input type="hidden" name="productId" value={product.id}/><input type="hidden" name="mediaId" value={m.id}/><button className="text-xs text-red-700">Remove</button></form></div></div>)}</div>
      <form action={uploadProductMedia} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 items-end"><input type="hidden" name="productId" value={product.id}/><label className={label}>Role<select className={input} name="role"><option value="primary">Primary photo</option><option value="gallery">Gallery photo</option><option value="video">9:16 video</option><option value="poster">Video poster</option></select></label><label className={label}>File<input className={input} name="file" type="file" required/></label><label className={label}>Alt text<input className={input} name="alt"/></label><label className={label}>Focal point<input className={input} name="objectPosition" defaultValue="50% 50%"/></label><button className="rounded-md border border-line-strong px-4 py-2.5 text-sm">Upload</button></form>
    </section>
  </div>;
}

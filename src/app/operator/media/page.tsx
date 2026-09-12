import Link from "next/link";
import { repo } from "@/db/repo";
import { uploadStorefrontMedia } from "./actions";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function MediaLibrary({ searchParams }: { searchParams: Promise<{ uploaded?: string }> }) {
  const items = await repo.media.list();
  const uploaded = (await searchParams).uploaded;
  return <div className="pb-20">
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8"><div><p className="font-mono text-xs uppercase tracking-widest text-gold">Vercel Blob + Neon</p><h1 className="font-display text-3xl font-semibold mt-2">Media library</h1><p className="text-sm text-ink-faint mt-2">Upload once, then select media from the Storefront CMS or Product Studio.</p></div><Link href="/operator/storefront" className="rounded-full bg-ink px-4 py-2 text-sm text-bg no-underline">Homepage CMS</Link></div>
    <form action={uploadStorefrontMedia} className="grid sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] gap-4 items-end rounded-xl border border-line bg-bg-raised p-5">
      <label className={label}>Image or video<input className={input} type="file" name="file" accept="image/*,video/*" required/></label>
      <label className={label}>Accessible label / alt text<input className={input} name="alt" required/></label>
      <label className={label}>Image focal point<input className={input} name="objectPosition" defaultValue="50% 50%"/></label>
      <button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Upload</button>
    </form>
    <p className="mt-3 text-xs text-ink-faint">Images: 12 MB maximum. Video: 50 MB maximum. Library deletion is disabled until all product and storefront references can be shown safely.</p>
    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{items.map((item) => <article key={item.id} className={`overflow-hidden rounded-xl border bg-bg-raised ${uploaded === item.id ? "border-ok ring-2 ring-ok/20" : "border-line"}`}>
      {item.kind === "video" ? <video src={item.url} className="aspect-[4/3] w-full bg-black object-cover" controls preload="metadata"/> : <img src={item.url} alt={item.alt ?? ""} loading="lazy" className="aspect-[4/3] w-full object-cover" style={{ objectPosition: item.objectPosition }}/>}<div className="p-3"><p className="truncate text-sm font-medium">{item.alt || "Untitled media"}</p><p className="mt-1 font-mono text-[0.62rem] uppercase tracking-wider text-ink-faint">{item.kind} · {item.contentType ?? "unknown"}</p><a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs text-gold no-underline">Open original →</a></div>
    </article>)}</div>
  </div>;
}

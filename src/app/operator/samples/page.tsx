import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { hasReel, loadSamples, sampleLabel, sampleStory } from "@/lib/samples";
import { SamplePreview } from "@/components/sample-preview";
import { ImageDrop } from "@/components/image-drop";
import { saveDemoSample } from "./actions";

export const dynamic = "force-dynamic";
const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function DemoSamplesEditor({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOperator();
  const saved = (await searchParams).saved;
  const [rows, samples, library] = await Promise.all([
    repo.demoSamples.list().catch(() => null),
    loadSamples("en", { includeHidden: true }),
    repo.media.list().catch(() => []),
  ]);
  const usable = library.filter((item) => item.active && !item.fingerprint);
  const images = usable.filter((item) => item.kind === "image");
  const videos = usable.filter((item) => item.kind === "video");

  return <div className="pb-20">
    <div className="mb-8"><p className="font-mono text-xs uppercase tracking-widest text-gold">Homepage demo</p><h1 className="font-display text-3xl font-semibold mt-2">Demo samples</h1><p className="text-sm text-ink-faint mt-2 max-w-2xl">The sample profiles shoppers flip through in the homepage phone demo and at <code>/examples/…</code>. Drop in a photo (and a reel for talent samples) so people can picture their own. Names and wording are fictional sample copy.</p></div>
    {rows === null && <p className="mb-6 text-sm text-warn">Table not created yet — run <code>npm run db:push</code>, then reload. Samples show built-in placeholders until then.</p>}
    <div className="grid gap-5">{samples.map((sample, index) => {
      const row = rows?.find((item) => item.key === sample.key);
      return <details key={sample.key} open={index === 0 || saved === sample.key} className="group rounded-xl border border-line bg-bg-raised shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><span className="font-mono text-[0.65rem] uppercase tracking-widest text-gold">{String(index + 1).padStart(2, "0")} · {sample.key}</span><h2 className="font-display text-xl mt-1">{sampleLabel(sample.key, "en")} — {sample.kind === "talent" ? sample.talent.displayName : sample.profile.displayName}</h2><p className="mt-1 max-w-xl text-xs italic text-ink-faint">“{sampleStory(sample.key, "en")}”</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs ${sample.active ? "bg-ok/10 text-ok" : "bg-bg-sunken text-ink-faint"}`}>{sample.active ? "Visible" : "Hidden"}</span><span className="text-ink-faint group-open:rotate-180">⌄</span></div></summary>
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[1fr_300px]">
          <form action={saveDemoSample} className="grid gap-6 content-start">
            <input type="hidden" name="key" value={sample.key}/>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={sample.active}/> Show on homepage</label>
              <label className="flex items-center gap-2 text-sm">Order <input className={`${input} w-20`} type="number" name="sortOrder" min={0} defaultValue={sample.order}/></label>
            </div>
            <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">{hasReel(sample.key) ? "HERO PHOTO" : "PROFILE PHOTO"}</legend>
              <ImageDrop name="portraitFile" current={row?.portrait ? { url: row.portrait.url, alt: row.portrait.alt ?? "" } : null} emptyLabel="No photo yet"/>
              <div className="grid sm:grid-cols-3 gap-4">
                <label className={label}>…or pick from the media library<select className={input} name="portraitMediaId" defaultValue={row?.portraitMediaId ?? ""}><option value="">No photo</option>{images.map((item) => <option key={item.id} value={item.id}>{item.alt || item.url.split("/").pop()}</option>)}</select></label>
                <label className={label}>Photo description (new uploads)<input className={input} name="alt" placeholder="Cheer athlete mid-stunt"/></label>
                <label className={label}>Focal point (new uploads)<input className={input} name="position" placeholder="50% 30%"/></label>
              </div>
              <p className="text-xs text-ink-faint">{hasReel(sample.key) ? "Portrait 4:5 works best." : "Square headshot works best (shown in a circle)."} Use photos you have rights to; they appear as a fictional sample.</p>
            </fieldset>
            {hasReel(sample.key) && <fieldset className="grid gap-4 rounded-lg border border-line p-4"><legend className="px-2 font-mono text-xs text-gold">HIGHLIGHT REEL</legend>
              <label className={label}>Upload a video (MP4, up to 7 MB)<input className={input} type="file" name="reelFile" accept="video/mp4,video/webm"/></label>
              <label className={label}>…or pick from the media library<select className={input} name="reelMediaId" defaultValue={row?.reelMediaId ?? ""}><option value="">Built-in placeholder video</option>{videos.map((item) => <option key={item.id} value={item.id}>{item.alt || item.url.split("/").pop()}</option>)}</select></label>
            </fieldset>}
            <div><button className="rounded-full bg-ink px-5 py-2.5 text-sm text-bg">Save sample</button>{saved === sample.key && <span className="ml-3 text-sm text-ok">Saved — live on the homepage</span>}<a href={`/examples/${sample.key}`} target="_blank" rel="noopener noreferrer" className="ml-4 text-sm underline">Open full example ↗</a></div>
          </form>
          <div className="hidden lg:block"><p className="mb-2 text-xs uppercase tracking-widest text-ink-faint">Preview</p><div className="max-h-[560px] overflow-y-auto rounded-2xl border border-line"><SamplePreview sample={sample} locale="en" compact/></div></div>
        </div>
      </details>;
    })}</div>
  </div>;
}

import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";
import { activeProviderStatus } from "@/lib/providers";
import { RESUME_ENTITLEMENT_KEY } from "@/lib/entitlements";
import { saveResumeSettings } from "./actions";
export const dynamic = "force-dynamic";

const input = "w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm";
const label = "grid gap-1.5 text-xs font-medium text-ink-soft";

export default async function OperatorResume({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOperator();
  const s = await repo.resumeSettings.get();
  const saved = (await searchParams).saved;
  const providerStatus = activeProviderStatus();

  const toggle = (name: string, checked: boolean, labelText: string, hint: string) => (
    <label className="flex items-start gap-3 rounded-lg border border-line p-4">
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-0.5" />
      <span><span className="block text-sm font-medium">{labelText}</span><span className="block text-xs text-ink-faint mt-0.5">{hint}</span></span>
    </label>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Resume</h1>
        {saved && <span className="text-sm text-ok">Saved</span>}
      </div>

      <form action={saveResumeSettings} className="grid gap-6">
        <section className="grid gap-3">
          <h2 className="font-display text-lg">Capability</h2>
          {toggle("featureEnabled", s.featureEnabled, "Resume feature enabled", "Master switch for the whole Resume area.")}
          {toggle("manualBuilderEnabled", s.manualBuilderEnabled, "Manual resume builder", "Owner can build a resume by hand.")}
          {toggle("uploadEnabled", s.uploadEnabled, "Resume upload", "Owner can upload an existing PDF.")}
          {toggle("aiExtractionEnabled", s.aiExtractionEnabled, "AI extraction", "Requires a provider credential as an environment variable — never set here.")}
          {toggle("publicPageEnabled", s.publicPageEnabled, "Public resume page", "Global switch — the owner's own publicEnabled toggle still applies on top of this.")}
          {toggle("pdfDownloadEnabled", s.pdfDownloadEnabled, "Original PDF download", "Global switch — the owner's own showOriginalPdf toggle still applies on top of this.")}
        </section>

        <section className="grid gap-2 rounded-xl border border-line bg-bg-raised p-5">
          <h2 className="font-display text-lg">Active AI provider</h2>
          <p className="text-sm">
            <span className="font-mono">{providerStatus.provider}</span>{" — "}
            {providerStatus.configured ? <span className="text-ok">configured</span> : <span className="text-warn">not configured (missing {providerStatus.missingEnvVar})</span>}
          </p>
          <p className="text-xs text-ink-faint">Set via the <span className="font-mono">AI_EXTRACTION_PROVIDER</span> environment variable (anthropic or groq). Shared with the Business Card Scanner. Credentials are environment-only — never entered in this CMS.</p>
        </section>

        <section className="grid gap-3 rounded-xl border border-line bg-bg-raised p-5">
          <h2 className="font-display text-lg">Entitlement &amp; limits</h2>
          <label className={label}>Required entitlement key (blank = free)<input className={input} name="requiredEntitlement" defaultValue={s.requiredEntitlement ?? ""} placeholder={RESUME_ENTITLEMENT_KEY} /></label>
          <p className="text-xs text-ink-faint -mt-2">
            Not hardcoded — this business decision isn&apos;t made yet. Leave blank for free access (current setting), or set it to <code className="font-mono">{RESUME_ENTITLEMENT_KEY}</code> (Resume&apos;s own key — independent of <code className="font-mono">solo_networking</code>; neither implies the other) once packaging is decided.
          </p>
          <label className={label}>Max upload size (MB)<input className={input} type="number" name="maxUploadSizeMb" defaultValue={s.maxUploadSizeMb} /></label>
          <label className={label}>Allowed document types (comma separated MIME types)<input className={input} name="allowedDocumentTypes" defaultValue={s.allowedDocumentTypes.join(", ")} placeholder="application/pdf, image/jpeg, image/png" /></label>
          <p className="text-xs text-ink-faint -mt-2">PDF works with any provider. Images (JPEG/PNG) only extract with an image-capable provider (e.g. Groq, or Anthropic on an image) — a PDF still requires Anthropic, since Groq has no document/PDF input.</p>
        </section>

        <section className="grid gap-3 rounded-xl border border-line bg-bg-raised p-5">
          <h2 className="font-display text-lg">Public copy</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={label}>Section title (EN)<input className={input} name="sectionTitleEn" defaultValue={s.sectionTitleEn} /></label>
            <label className={label}>Section title (ES)<input className={input} name="sectionTitleEs" defaultValue={s.sectionTitleEs} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={label}>CTA label (EN)<input className={input} name="ctaLabelEn" defaultValue={s.ctaLabelEn} /></label>
            <label className={label}>CTA label (ES)<input className={input} name="ctaLabelEs" defaultValue={s.ctaLabelEs} /></label>
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border border-line bg-bg-raised p-5">
          <h2 className="font-display text-lg">Upsell (shown when a customer lacks the required entitlement)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={label}>Heading (EN)<input className={input} name="upsellHeadingEn" defaultValue={s.upsellHeadingEn} /></label>
            <label className={label}>Heading (ES)<input className={input} name="upsellHeadingEs" defaultValue={s.upsellHeadingEs} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={label}>Body (EN)<textarea className={input} name="upsellBodyEn" defaultValue={s.upsellBodyEn} /></label>
            <label className={label}>Body (ES)<textarea className={input} name="upsellBodyEs" defaultValue={s.upsellBodyEs} /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className={label}>CTA (EN)<input className={input} name="upsellCtaEn" defaultValue={s.upsellCtaEn} /></label>
            <label className={label}>CTA (ES)<input className={input} name="upsellCtaEs" defaultValue={s.upsellCtaEs} /></label>
          </div>
          <label className={label}>Destination product slug<input className={input} name="upsellProductSlug" defaultValue={s.upsellProductSlug ?? ""} placeholder="networking-kit" /></label>
          <p className="text-xs text-ink-faint -mt-2">Resolved live against the catalog — price/name are never hardcoded here or in the upsell UI.</p>
        </section>

        <button className="rounded-full bg-ink text-bg px-6 py-2.5 text-sm font-medium hover:bg-gold transition-colors self-start">Save</button>
      </form>
    </div>
  );
}

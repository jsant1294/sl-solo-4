import Link from "next/link";
import { localeFrom, withLang } from "@/i18n/util";
import { repo } from "@/db/repo";
import { db } from "@/db";
import { getResumePageAccess } from "./actions";
export const dynamic = "force-dynamic";

export default async function ResumeOverview({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";
  const L = (h: string) => withLang(h, locale);

  const access = await getResumePageAccess();
  if (!access.ok) return <ResumeUpsell locale={locale} reason={access.reason} />;

  const { resume, settings, username } = access;
  const sectionCounts = resume ? await Promise.all(
    (["experience", "education", "skills", "certifications", "languages", "projects"] as const).map(async (s) => (await repo.resume[s].list(resume.id)).length),
  ) : [0, 0, 0, 0, 0, 0];
  const totalItems = sectionCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold mb-6">{es ? "Currículum" : "Resume"}</h1>

      <div className="rounded-xl border border-line bg-bg-raised p-5 mb-6">
        {resume?.headline || resume?.professionalSummary || totalItems > 0 ? (
          <>
            {resume?.headline && <p className="font-medium">{resume.headline}</p>}
            {resume?.professionalSummary && <p className="mt-1 text-sm text-ink-soft line-clamp-2">{resume.professionalSummary}</p>}
            <p className="mt-3 text-xs text-ink-faint">{totalItems} {es ? "elementos guardados" : "saved items"}</p>
          </>
        ) : (
          <p className="text-sm text-ink-faint">{es ? "Aún no has creado tu currículum." : "You haven't built your resume yet."}</p>
        )}
        <p className="mt-3 flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 ${resume?.publicEnabled ? "border border-ok/40 text-ok" : "border border-line text-ink-faint"}`}>
            {resume?.publicEnabled ? (es ? "Público" : "Public") : (es ? "Privado" : "Private")}
          </span>
          {resume?.originalResumeMediaId && <span className="rounded-full border border-line px-2 py-0.5 text-ink-faint">{es ? "PDF subido" : "PDF uploaded"}</span>}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {settings.manualBuilderEnabled && (
          <Link href={L("/app/resume/edit")} className="inline-flex items-center justify-center rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors flex-1">
            {es ? "Editar currículum" : "Edit Resume"}
          </Link>
        )}
        {settings.uploadEnabled && (
          <Link href={L("/app/resume/upload")} className="inline-flex items-center justify-center rounded-full border border-line-strong px-6 py-3 text-sm no-underline hover:border-gold transition-colors flex-1">
            {es ? "Subir currículum" : "Upload Resume"}
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={L("/app/resume/preview")} className="text-sm text-ink-soft hover:text-gold no-underline">{es ? "Vista previa →" : "Preview →"}</Link>
        {resume?.publicEnabled && (
          <a href={`/u/${username}/resume`} target="_blank" rel="noreferrer" className="text-sm text-ink-soft hover:text-gold no-underline">{es ? "Ver página pública ↗" : "View public page ↗"}</a>
        )}
      </div>
    </div>
  );
}

async function ResumeUpsell({ locale, reason }: { locale: "en" | "es"; reason: "no_profile" | "not_entitled" | "disabled" }) {
  const es = locale === "es";
  if (reason === "no_profile") {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-display text-xl">{es ? "Crea tu perfil Solo primero" : "Create your Solo profile first"}</p>
        <Link href={withLang("/app/create", locale)} className="inline-flex mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors">{es ? "Crear perfil" : "Create profile"}</Link>
      </div>
    );
  }
  if (reason === "disabled") {
    return (
      <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-display text-xl">{es ? "Currículum no disponible por ahora" : "Resume is unavailable right now"}</p>
      </div>
    );
  }
  const settings = db ? await repo.resumeSettings.get() : null;
  const product = settings?.upsellProductSlug && db ? await repo.products.bySlug(settings.upsellProductSlug) : undefined;
  const heading = (es ? settings?.upsellHeadingEs : settings?.upsellHeadingEn) ?? (es ? "Crea tu currículum profesional" : "Build your professional resume");
  const body = (es ? settings?.upsellBodyEs : settings?.upsellBodyEn) ?? "";
  const ctaLabel = (es ? settings?.upsellCtaEs : settings?.upsellCtaEn) ?? (es ? "Más información" : "Learn more");
  return (
    <div className="rounded-xl border border-dashed border-line-strong p-10 text-center">
      <p className="font-display text-2xl">{heading}</p>
      {body && <p className="mt-3 text-sm text-ink-soft max-w-sm mx-auto">{body}</p>}
      {product && (
        <Link href={withLang(`/hardware/${product.slug}`, locale)} className="inline-flex mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium no-underline hover:bg-gold transition-colors">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

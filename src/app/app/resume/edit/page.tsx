import Link from "next/link";
import { notFound } from "next/navigation";
import { localeFrom, withLang } from "@/i18n/util";
import { repo } from "@/db/repo";
import { getResumePageAccess } from "../actions";
import { BasicsForm } from "../basics-form";
import { VisibilityForm } from "../visibility-form";
import { SectionEditor } from "../section-editor";
export const dynamic = "force-dynamic";

const SECTION_LABELS: { key: "experience" | "education" | "skills" | "certifications" | "languages" | "projects"; en: string; es: string }[] = [
  { key: "experience", en: "Experience", es: "Experiencia" },
  { key: "education", en: "Education", es: "Educación" },
  { key: "skills", en: "Skills", es: "Habilidades" },
  { key: "certifications", en: "Certifications", es: "Certificaciones" },
  { key: "languages", en: "Languages", es: "Idiomas" },
  { key: "projects", en: "Projects", es: "Proyectos" },
];

export default async function EditResume({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";

  const access = await getResumePageAccess();
  if (!access.ok) notFound();
  if (!access.settings.manualBuilderEnabled) notFound();

  const resume = await repo.resume.getOrCreateForProfile(access.profileId, access.userId);
  const sections = await Promise.all(SECTION_LABELS.map(async (s) => [s.key, await repo.resume[s.key].list(resume.id)] as const));
  const sectionData = Object.fromEntries(sections);

  return (
    <div className="max-w-2xl">
      <Link href={withLang("/app/resume", locale)} className="text-sm text-ink-soft hover:text-gold no-underline">← {es ? "Currículum" : "Resume"}</Link>
      <h1 className="font-display text-3xl font-semibold mt-4 mb-8">{es ? "Editar currículum" : "Edit Resume"}</h1>

      <section className="mb-10">
        <BasicsForm initialHeadline={resume.headline ?? ""} initialSummary={resume.professionalSummary ?? ""} locale={locale} />
      </section>

      {SECTION_LABELS.map((s) => (
        <section key={s.key} className="mb-10">
          <p className="text-xs uppercase tracking-widest text-gold font-mono mb-3">{es ? s.es : s.en}</p>
          <SectionEditor section={s.key} resumeProfileId={resume.id} items={sectionData[s.key]} locale={locale} />
        </section>
      ))}

      <section className="mb-10 rounded-xl border border-line bg-bg-raised p-5">
        <VisibilityForm resume={resume} canPublish={access.settings.publicPageEnabled} canDownloadPdf={access.settings.pdfDownloadEnabled} locale={locale} />
      </section>
    </div>
  );
}

import type { Locale } from "@/i18n/dict";
import type { ResumeProfile } from "@/db/schema";
import type { ResumeSections } from "@/lib/resume-view";
import type { PublicContactAction } from "@/lib/contact-channels";
import { ShareResumeButton } from "@/app/u/[username]/resume/share-button";
import { ResumeContactAction } from "@/components/resume-contact-action";
import { DownloadResumeLink } from "@/components/resume-download-link";

const T = {
  en: {
    summary: "Professional Summary", experience: "Experience", skills: "Skills", education: "Education",
    certifications: "Certifications", languages: "Languages", projects: "Projects",
    download: "Download Resume", present: "Present",
  },
  es: {
    summary: "Resumen Profesional", experience: "Experiencia", skills: "Habilidades", education: "Educación",
    certifications: "Certificaciones", languages: "Idiomas", projects: "Proyectos",
    download: "Descargar Currículum", present: "Actual",
  },
};

export function ResumeDisplay({
  displayName, headline, avatarUrl, contactFields, actions, resume, sections, locale, pdfUrl, shareUrl, preview,
}: {
  displayName: string; headline: string | null; avatarUrl: string | null;
  contactFields: { email: string | null; phone: string | null; location: string | null; website: string | null };
  actions: PublicContactAction[];
  resume: ResumeProfile; sections: ResumeSections; locale: Locale; pdfUrl: string | null; shareUrl: string;
  preview?: boolean;
}) {
  const t = T[locale];
  const initials = displayName.split(" ").map((s) => s[0]).slice(0, 2).join("");
  const dateRange = (start: string | null, end: string | null, current: boolean) => {
    const parts = [start, current ? t.present : end].filter(Boolean);
    return parts.length ? parts.join(" – ") : null;
  };
  const contactActions = actions.filter((a) => a.type !== "share" && a.href);

  // Preview reuses the /app dashboard's own <main>/background chrome (it's rendered inside
  // that layout) — only the public route gets the full-bleed page shell, avoiding nested
  // <main> elements and doubled padding/max-width containers.
  const Wrapper = preview ? "div" : "main";
  return (
    <Wrapper className={preview ? "" : "min-h-screen bg-bg text-ink"}>
      {preview && (
        <div className="mb-6 rounded-lg bg-gold/15 border border-gold/30 px-4 py-2 text-center text-xs font-medium text-ink">
          {locale === "es" ? "Vista previa — así lo ven tus visitantes" : "Preview — this is what visitors see"}
        </div>
      )}
      <div className={preview ? "mx-auto max-w-[560px] pb-16" : "mx-auto max-w-[560px] px-5 pb-24 pt-10 sm:pt-14"}>
        <div className="text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={displayName} className="mx-auto h-24 w-24 rounded-full border-2 border-bg-raised object-cover shadow-md sm:h-28 sm:w-28" />
          ) : (
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-line-strong bg-bg-raised font-display text-2xl text-gold shadow-md sm:h-28 sm:w-28">{initials}</div>
          )}
          <h1 className="font-display text-3xl font-semibold tracking-tight mt-5">{displayName}</h1>
          {headline && <p className="text-gold text-base font-medium mt-1.5">{headline}</p>}
          {contactFields.location && <p className="text-ink-faint text-xs mt-1.5 font-mono">{contactFields.location}</p>}
        </div>

        {contactActions.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {contactActions.map((a) => <ResumeContactAction key={a.type} href={a.href!} label={a.label} />)}
          </div>
        )}

        {resume.showSummary && resume.professionalSummary && (
          <Section title={t.summary}><p className="text-[0.95rem] leading-relaxed text-ink-soft whitespace-pre-wrap">{resume.professionalSummary}</p></Section>
        )}

        {sections.experience.length > 0 && (
          <Section title={t.experience}>
            <div className="grid gap-4">
              {sections.experience.map((e) => (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{e.title}</p>
                    {dateRange(e.startDate, e.endDate, e.current) && <p className="text-xs text-ink-faint font-mono shrink-0">{dateRange(e.startDate, e.endDate, e.current)}</p>}
                  </div>
                  {(e.company || e.location) && <p className="text-sm text-gold">{[e.company, e.location].filter(Boolean).join(" · ")}</p>}
                  {e.description && <p className="mt-1.5 text-sm text-ink-soft whitespace-pre-wrap">{e.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {sections.skills.length > 0 && (
          <Section title={t.skills}>
            <div className="flex flex-wrap gap-2">
              {sections.skills.map((s) => <span key={s.id} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft">{s.name}</span>)}
            </div>
          </Section>
        )}

        {sections.education.length > 0 && (
          <Section title={t.education}>
            <div className="grid gap-4">
              {sections.education.map((e) => (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{e.institution}</p>
                    {dateRange(e.startDate, e.endDate, false) && <p className="text-xs text-ink-faint font-mono shrink-0">{dateRange(e.startDate, e.endDate, false)}</p>}
                  </div>
                  {(e.degree || e.fieldOfStudy) && <p className="text-sm text-gold">{[e.degree, e.fieldOfStudy].filter(Boolean).join(" · ")}</p>}
                  {e.description && <p className="mt-1.5 text-sm text-ink-soft whitespace-pre-wrap">{e.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {sections.certifications.length > 0 && (
          <Section title={t.certifications}>
            <div className="grid gap-3">
              {sections.certifications.map((c) => (
                <div key={c.id}>
                  <p className="font-medium text-sm">{c.name}</p>
                  {c.issuer && <p className="text-xs text-ink-faint">{c.issuer}{c.issueDate ? ` · ${c.issueDate}` : ""}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {sections.languages.length > 0 && (
          <Section title={t.languages}>
            <div className="flex flex-wrap gap-2">
              {sections.languages.map((l) => <span key={l.id} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-soft">{l.language}{l.proficiency ? ` · ${l.proficiency}` : ""}</span>)}
            </div>
          </Section>
        )}

        {sections.projects.length > 0 && (
          <Section title={t.projects}>
            <div className="grid gap-4">
              {sections.projects.map((p) => (
                <div key={p.id}>
                  <p className="font-medium">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-ink no-underline hover:text-gold">{p.name} ↗</a> : p.name}</p>
                  {p.role && <p className="text-sm text-gold">{p.role}</p>}
                  {p.description && <p className="mt-1.5 text-sm text-ink-soft whitespace-pre-wrap">{p.description}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="mt-10 flex flex-col items-center gap-3">
          {pdfUrl && <DownloadResumeLink href={pdfUrl} label={t.download} />}
          <ShareResumeButton displayName={displayName} headline={headline} shareUrl={shareUrl} locale={locale} />
        </div>

        <div className="mt-12 text-center opacity-60">
          <span className="font-display text-sm font-semibold text-ink">SnapLink</span>
          <span className="ml-2 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-gold">Solo</span>
        </div>
      </div>
    </Wrapper>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-9">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold mb-3">{title}</p>
      {children}
    </div>
  );
}

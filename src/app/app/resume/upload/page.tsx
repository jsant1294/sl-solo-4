import Link from "next/link";
import { notFound } from "next/navigation";
import { localeFrom, withLang } from "@/i18n/util";
import { getResumePageAccess } from "../actions";
import { UploadFlow } from "../upload-flow";
import { CurrentFile } from "../current-file";
export const dynamic = "force-dynamic";

export default async function UploadResumePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });
  const es = locale === "es";

  const access = await getResumePageAccess();
  if (!access.ok) notFound();
  if (!access.settings.uploadEnabled) notFound();

  return (
    <div className="max-w-xl">
      <Link href={withLang("/app/resume", locale)} className="text-sm text-ink-soft hover:text-gold no-underline">← {es ? "Currículum" : "Resume"}</Link>
      <h1 className="font-display text-3xl font-semibold mt-4 mb-6">{es ? "Subir currículum" : "Upload Resume"}</h1>
      {access.resume?.originalFileName && <CurrentFile fileName={access.resume.originalFileName} locale={locale} />}
      <UploadFlow locale={locale} aiExtractionEnabled={access.settings.aiExtractionEnabled} hasExistingFile={Boolean(access.resume?.originalResumeMediaId)} allowedDocumentTypes={access.settings.allowedDocumentTypes} />
    </div>
  );
}

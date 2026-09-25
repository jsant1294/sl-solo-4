import { notFound } from "next/navigation";
import { localeFrom } from "@/i18n/util";
import { repo } from "@/db/repo";
import { getResumePageAccess } from "../actions";
import { buildResumeSections, resumeContactFields } from "@/lib/resume-view";
import { ResumeDisplay } from "@/components/resume-display";
import { publicContactActions } from "@/lib/contact-channels";
import { canonicalProfileUrl } from "@/lib/profile-sharing";
export const dynamic = "force-dynamic";

export default async function PreviewResume({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const locale = localeFrom({ lang });

  const access = await getResumePageAccess();
  if (!access.ok || !access.resume) notFound();

  const profileRow = await repo.profiles.getOwned(access.profileId, access.userId);
  if (!profileRow) notFound();

  const sections = await buildResumeSections(access.resume, true);
  const contactFields = resumeContactFields(profileRow, access.resume, true);
  const phoneTypes = new Set(["call", "sms", "whatsapp"]);
  const actions = publicContactActions(profileRow, profileRow.contactChannels, "", locale).filter((a) => {
    if (a.type === "share") return false;
    if (a.type === "email") return Boolean(contactFields.email);
    if (phoneTypes.has(a.type)) return Boolean(contactFields.phone);
    return true;
  });
  const ctaWebsite = contactFields.website ? [{ type: "custom" as const, label: locale === "es" ? "Sitio web" : "Website", href: contactFields.website.startsWith("http") ? contactFields.website : `https://${contactFields.website}` }] : [];
  const pdfUrl = access.resume.showOriginalPdf && access.resume.originalResumeMediaId
    ? (await repo.media.byId(access.resume.originalResumeMediaId))?.url ?? null
    : null;

  return (
    <ResumeDisplay
      displayName={profileRow.displayName} headline={access.resume.headline} avatarUrl={profileRow.avatarUrl}
      contactFields={contactFields} actions={[...actions, ...ctaWebsite]}
      resume={access.resume} sections={sections} locale={locale}
      pdfUrl={pdfUrl} shareUrl={`${canonicalProfileUrl(access.username)}/resume`} preview
    />
  );
}

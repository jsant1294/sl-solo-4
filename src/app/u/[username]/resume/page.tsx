import { hasTalent } from "@/lib/talent/model";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { data } from "@/lib/data";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { publicContactActions } from "@/lib/contact-channels";
import { buildResumeSections, resumeContactFields } from "@/lib/resume-view";
import { ResumeDisplay } from "@/components/resume-display";
import { canonicalProfileUrl } from "@/lib/profile-sharing";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  if (!profile || hasTalent(profile.data) || profile.status !== "active" || !db) return { title: "SnapLink", robots: { index: false, follow: false } };
  const resume = await repo.resume.getPublic(profile.id);
  if (!resume) return { title: "SnapLink", robots: { index: false, follow: false } };
  const title = resume.headline ? `${profile.displayName} — ${resume.headline}` : profile.displayName;
  return {
    title: `${title} — Resume`,
    robots: profile.type === "kids" ? { index: false, follow: false } : undefined,
    openGraph: { title, type: "profile" },
  };
}

export default async function PublicResume({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  if (!profile || hasTalent(profile.data) || profile.status !== "active" || profile.type === "kids") notFound();
  if (!db) notFound(); // Resume is DB-only, like devices/bundles — no in-memory demo equivalent.

  const resume = await repo.resume.getPublic(profile.id);
  if (!resume) notFound();

  const settings = await repo.resumeSettings.get();
  if (!settings.publicPageEnabled) notFound();

  void repo.commerce.record({ type: "resume_view" }).catch(() => undefined);

  const sections = await buildResumeSections(resume, true);
  const contactFields = resumeContactFields(profile, resume, true);
  // Resume-specific show{Email,Phone} toggles narrow the profile's own public contact
  // channels further — an email channel can be public on the main profile yet hidden here.
  const phoneTypes = new Set(["call", "sms", "whatsapp"]);
  const actions = publicContactActions(profile, profile.contactChannels, "", profile.locale).filter((a) => {
    if (a.type === "share") return false;
    if (a.type === "email") return Boolean(contactFields.email);
    if (phoneTypes.has(a.type)) return Boolean(contactFields.phone);
    return true;
  });
  const pdfUrl = resume.showOriginalPdf && resume.originalResumeMediaId
    ? (await repo.media.byId(resume.originalResumeMediaId))?.url ?? null
    : null;
  const ctaWebsite = contactFields.website ? [{ type: "custom" as const, label: profile.locale === "es" ? "Sitio web" : "Website", href: contactFields.website.startsWith("http") ? contactFields.website : `https://${contactFields.website}` }] : [];

  return (
    <ResumeDisplay
      displayName={profile.displayName} headline={resume.headline} avatarUrl={profile.avatarUrl}
      contactFields={contactFields} actions={[...actions, ...ctaWebsite]}
      resume={resume} sections={sections} locale={profile.locale}
      pdfUrl={pdfUrl} shareUrl={`${canonicalProfileUrl(profile.username)}/resume`}
    />
  );
}

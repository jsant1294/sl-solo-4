import { repo } from "@/db/repo";
import type { Profile, ResumeProfile } from "@/db/schema";

/**
 * Shared between the public resume page (/u/[username]/resume) and the owner's preview
 * (/app/resume/preview) so "preview" genuinely shows what a visitor sees — same filtering
 * logic, not a second implementation that can drift.
 */
export async function buildResumeSections(resume: ResumeProfile, applyVisibility: boolean) {
  const [experience, education, skills, certifications, languages, projects] = await Promise.all([
    repo.resume.experience.list(resume.id),
    repo.resume.education.list(resume.id),
    repo.resume.skills.list(resume.id),
    repo.resume.certifications.list(resume.id),
    repo.resume.languages.list(resume.id),
    repo.resume.projects.list(resume.id),
  ]);
  const filter = <T extends { visible: boolean }>(items: T[]) => (applyVisibility ? items.filter((i) => i.visible) : items);
  return {
    experience: (resume.showExperience || !applyVisibility) ? filter(experience) : [],
    education: (resume.showEducation || !applyVisibility) ? filter(education) : [],
    skills: (resume.showSkills || !applyVisibility) ? filter(skills) : [],
    certifications: (resume.showCertifications || !applyVisibility) ? filter(certifications) : [],
    languages: (resume.showLanguages || !applyVisibility) ? filter(languages) : [],
    projects: (resume.showProjects || !applyVisibility) ? filter(projects) : [],
  };
}

export type ResumeSections = Awaited<ReturnType<typeof buildResumeSections>>;

/** Contact fields are read live from the profile — never duplicated on the resume — filtered by the resume's per-field visibility toggles. */
export function resumeContactFields(profile: Profile, resume: ResumeProfile, applyVisibility: boolean) {
  return {
    email: (!applyVisibility || resume.showEmail) ? profile.email : null,
    phone: (!applyVisibility || resume.showPhone) ? profile.phone : null,
    location: (!applyVisibility || resume.showLocation) ? profile.location : null,
    website: (!applyVisibility || resume.showWebsite) ? profile.website : null,
  };
}

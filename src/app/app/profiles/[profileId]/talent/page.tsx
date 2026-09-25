import { notFound } from "next/navigation";
import { requireOwnedProfile, AuthError, ForbiddenError } from "@/lib/auth";
import { readEnvelope, newTalent, copy, disciplines, type Discipline } from "@/lib/talent/model";
import { localeFrom } from "@/i18n/util";
import { TalentEditor } from "@/components/talent/editor";
export const dynamic = "force-dynamic";
export default async function TalentStudio({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ lang?: string; discipline?: string }> }) {
  const { profileId } = await params; const sp = await searchParams; const locale = localeFrom(sp);
  // Landing "Create yours" preselects a discipline; it only seeds a brand-new draft, never overrides saved content.
  const primary: Discipline = disciplines.includes(sp.discipline as Discipline) ? sp.discipline as Discipline : "athlete";
  let p;
  try { p = await requireOwnedProfile(profileId); } catch (e) { if (e instanceof AuthError || e instanceof ForbiddenError) notFound(); throw e; }
  if (!p || p.type === "kids") notFound();
  const saved = readEnvelope(p.data);
  const initial = saved?.draft ?? { ...newTalent(p.displayName, primary), headline: p.locale === "es" ? copy("", p.headline || "") : copy(p.headline || ""), bio: p.locale === "es" ? copy("", p.bio || "") : copy(p.bio || ""), portrait: p.avatarUrl || "" };
  return <TalentEditor profileId={p.id} username={p.username} initial={initial} revision={saved?.revision ?? 0} published={!!saved?.published && p.status === "active"} locale={locale} />;
}

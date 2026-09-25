import { hasTalent } from "@/lib/talent/model";
import { talentLabels } from "@/lib/talent/labels";
import { notFound } from "next/navigation";
import { localeFrom } from "@/i18n/util";
import { requireOwnedProfile, AuthError, ForbiddenError } from "@/lib/auth";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { StudioShell } from "./studio-shell";
import { getProfileExperience } from "@/lib/profile-data";
export const dynamic = "force-dynamic";

export default async function ProfileStudio({
  params, searchParams,
}: { params: Promise<{ profileId: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { profileId } = await params;
  const locale = localeFrom(await searchParams);

  // Ownership enforced server-side: a non-owner gets 404, not a redirect leak.
  let profile;
  try {
    profile = await requireOwnedProfile(profileId);
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) notFound();
    throw e;
  }
  if (!profile) notFound();

  const p = profile as unknown as {
    id: string; type: string; status: string; username: string; displayName: string;
    headline: string | null; bio: string | null; avatarUrl: string | null; phone: string | null;
    email: string | null; website: string | null; location: string | null; theme: string;
    accent: string | null; locale: string; data: unknown; destinationToken?: string;
    links: { id: string; type: string; label: string | null; url: string; sortOrder: number; visible: boolean; profileId: string }[];
    contactChannels: { id: string; profileId: string; type: string; value: string | null; enabled: boolean; public: boolean; sortOrder: number; createdAt: Date; updatedAt: Date }[];
  };
  const devices = db ? await repo.devices.byProfile(p.id) : [];
  const destination = db ? await repo.destinations.byProfile(p.id) : undefined;
  const experience = getProfileExperience(p.data, p.id);

  return (
    <>
    {p.type !== "kids" && <aside className="mb-6 rounded-2xl border border-line p-5"><a className="font-display text-xl underline underline-offset-4" href={`/app/profiles/${p.id}/talent?lang=${locale}`}>{talentLabels[locale].enable} ↗</a>{hasTalent(p.data) && <p className="mt-2 text-sm text-ink-soft">{talentLabels[locale].enabled}</p>}</aside>}
    <StudioShell
      locale={locale}
      profile={{
        id: p.id, type: p.type as never, status: p.status as never,
        username: p.username, displayName: p.displayName,
        headline: p.headline, bio: p.bio, avatarUrl: p.avatarUrl,
        phone: p.phone, email: p.email, website: p.website,
        location: p.location, theme: p.theme as never, accent: p.accent,
        locale: p.locale as never, data: p.data as never,
        primaryContactAction: experience.primaryContactAction, shareTitle: experience.shareTitle, shareDescription: experience.shareDescription, shareImageUrl: experience.shareImageUrl,
        favoriteLinkIds: experience.favoriteLinkIds, paymentMethods: experience.paymentMethods,
        destinationToken: destination?.token ?? p.destinationToken ?? "", links: (p.links ?? []) as never,
        contactChannels: experience.contactChannels as never,
      }}
      devices={devices.map((device) => ({ id: device.id, label: device.label ?? device.deviceCode, type: device.type, status: device.status, deviceCode: device.deviceCode }))}
    />
    </>
  );
}

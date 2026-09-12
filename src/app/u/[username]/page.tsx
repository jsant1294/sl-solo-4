import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { data } from "@/lib/data";
import { ProfileRenderer } from "@/components/renderers";
import { buildShareModel } from "@/lib/profile-sharing";
import { db } from "@/db";
import { repo } from "@/db/repo";
export const dynamic = "force-dynamic";

/** Kids pages must never be indexed; standard profiles are fine to index. */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  if (!profile || profile.status !== "active") return { title: "SnapLink", robots: { index: false, follow: false } };
  const share = buildShareModel(profile);
  return {
    title: share.title, description: share.description,
    alternates: { canonical: share.canonicalUrl },
    robots: profile.type === "kids" ? { index: false, follow: false } : undefined,
    openGraph: { title: share.title, description: share.description, url: share.canonicalUrl, type: "profile", images: [{ url: share.imageUrl, width: 1200, height: 630, alt: `${share.title} on SnapLink SOLO` }] },
    twitter: { card: "summary_large_image", title: share.title, description: share.description, images: [share.imageUrl] },
  };
}

export default async function PublicProfile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  // Draft/disabled never expose anything publicly.
  if (!profile || profile.status !== "active") notFound();

  if (db) void repo.events.record(profile.id, "profile_view", "direct").catch(() => undefined);
  return <ProfileRenderer profile={profile} links={profile.links} contactChannels={profile.contactChannels} locale={profile.locale} />;
}

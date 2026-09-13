import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";
import { canonicalProfileUrl } from "@/lib/profile-sharing";
import { getProfilePresentation, PROFILE_SECTIONS } from "@/lib/profile-data";
import { OperatorControlPlane } from "./operator-control";
export const dynamic = "force-dynamic";

export default async function OperatorProfileDetail({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOperator();
  const detail = await repo.profiles.adminById(id);
  if (!detail) notFound();
  const [devices, events] = await Promise.all([
    repo.devices.byProfile(id),
    repo.events.counts(id),
  ]);
  const presentation = getProfilePresentation(detail.data);
  const publicUrl = canonicalProfileUrl(detail.username);
  const destinationToken = (await repo.destinations.byProfile(id))?.token ?? null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/operator/profiles" className="text-sm text-ink-soft hover:text-gold no-underline">← Profiles</Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight mt-1">Profile control plane</h1>
        </div>
      </div>

      <OperatorControlPlane
        detail={serialise(detail)}
        devices={devices.map((d) => ({ id: d.id, deviceCode: d.deviceCode, label: d.label, status: d.status }))}
        events={events}
        presentation={presentation}
        publicUrl={publicUrl}
        destinationToken={destinationToken}
        sections={[...PROFILE_SECTIONS]}
      />
    </div>
  );
}

function serialise(detail: NonNullable<Awaited<ReturnType<typeof repo.profiles.adminById>>>) {
  return {
    id: detail.id,
    type: detail.type,
    status: detail.status,
    username: detail.username,
    displayName: detail.displayName,
    headline: detail.headline,
    bio: detail.bio,
    avatarUrl: detail.avatarUrl,
    phone: detail.phone,
    email: detail.email,
    website: detail.website,
    location: detail.location,
    accent: detail.accent,
    theme: detail.theme,
    locale: detail.locale,
    active: detail.active,
    createdAt: detail.createdAt.toISOString(),
    owner: detail.owner ? { email: detail.owner.email, name: detail.owner.name, plan: detail.owner.plan } : null,
    links: detail.links,
    contactChannels: detail.contactChannels,
    data: detail.data,
  };
}
import { redirect, notFound } from "next/navigation";
import { data } from "@/lib/data";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { PREVIEW_DEMO_PROFILE_ID } from "@/lib/preview-profile-demo";

/**
 * Stable destination resolver. NFC tags + QR codes encode /d/[token],
 * NEVER a username. Re-point the destination to move a tag to a new
 * profile, or attach a replacement tag to the same destination — no
 * reprinting. ?s= carries the source for the event seam.
 */
export default async function Destination({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string }> }) {
  const { token } = await params;
  const { s } = await searchParams;
  const profile = await data.resolveDestination(token);
  if (!profile || profile.status !== "active") notFound();

  const source = s === "nfc" || s === "qr" ? s : "link";
  if (db && profile.id !== PREVIEW_DEMO_PROFILE_ID) await repo.events.record(profile.id, source === "nfc" ? "tap" : source === "qr" ? "qr_scan" : "profile_view", source);
  redirect(`/u/${profile.username}?src=${source}`);
}

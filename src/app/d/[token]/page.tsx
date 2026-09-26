import { redirect, notFound } from "next/navigation";
import { after } from "next/server";
import { data } from "@/lib/data";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { PREVIEW_DEMO_PROFILE_ID } from "@/lib/preview-profile-demo";

/**
 * Stable destination resolver. NFC tags + QR codes encode /d/[token],
 * NEVER a username. Re-point the destination to move a tag to a new
 * profile, or attach a replacement tag to the same destination — no
 * reprinting. ?s= carries the source for the event seam.
 *
 * /d/ is a plain destination URL, NOT a physical device interaction: it never writes
 * ping_source, never writes device_id, and never touches devices.last_seen_at, so its
 * activity can never be counted as a Ping. The write is simply moved off the redirect-
 * critical path so a failed analytics insert can no longer strand a visitor.
 */
export default async function Destination({
  params, searchParams,
}: { params: Promise<{ token: string }>; searchParams: Promise<{ s?: string }> }) {
  const { token } = await params;
  const { s } = await searchParams;
  const profile = await data.resolveDestination(token);
  if (!profile || profile.status !== "active") notFound();

  const source = s === "nfc" || s === "qr" ? s : "link";
  if (db && profile.id !== PREVIEW_DEMO_PROFILE_ID) {
    const type = source === "nfc" ? "tap" : source === "qr" ? "qr_scan" : "profile_view";
    after(async () => {
      try {
        await repo.events.record(profile.id, type, source);
      } catch (error) {
        console.error("destination_event_persist_failed", {
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    });
  }
  redirect(`/u/${profile.username}?src=${source}`);
}

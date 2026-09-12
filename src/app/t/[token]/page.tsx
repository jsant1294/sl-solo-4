import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { repo } from "@/db/repo";

export const dynamic = "force-dynamic";

/** Physical NFC/QR resolver. Hardware encodes /t/{canonicalDeviceCode}. */
export default async function PhysicalTouchpoint({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  if (!db) notFound();
  const { token } = await params;
  const { s } = await searchParams;
  const resolved = await repo.devices.resolveTouchpoint(token);
  if (!resolved) notFound();
  const source = s === "qr" ? "qr" : "nfc";
  await repo.events.record(resolved.profile.id, source === "qr" ? "qr_scan" : "tap", source);
  redirect(`/u/${resolved.profile.username}?src=${source}`);
}

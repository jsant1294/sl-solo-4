import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { getSessionUserId } from "@/lib/auth";
import { classifyUnresolvedTouchpoint, isValidDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";
import { SiteHeader } from "@/components/site-chrome";
import { Section } from "@/components/primitives";

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
  if (resolved) {
    const source = s === "qr" ? "qr" : "nfc";
    await repo.events.record(resolved.profile.id, source === "qr" ? "qr_scan" : "tap", source);
    redirect(`/u/${resolved.profile.username}?src=${source}`);
  }

  // Not resolvable as a live tap. Distinguish a genuinely unknown/invalid code (404) from a
  // real device an operator has assigned to a customer, simply awaiting that customer's own
  // activation — see classifyUnresolvedTouchpoint for the exact rule.
  if (!isValidDeviceCode(token)) notFound();
  const device = await repo.devices.byToken(normalizeDeviceCode(token));
  const viewerUserId = await getSessionUserId();
  const outcome = classifyUnresolvedTouchpoint({
    deviceExists: Boolean(device),
    status: device?.status,
    assignedUserId: device?.assignedUserId,
    viewerUserId,
  });

  if (outcome.kind === "not_found") notFound();

  if (outcome.kind === "needs_activation") {
    const dest = `/activate?device=${encodeURIComponent(normalizeDeviceCode(token))}`;
    // Unauthenticated visitors go straight to /activate too — its own auth gate bounces to
    // sign-in while preserving this exact destination, so there's one auth-gate implementation,
    // not two. Authenticated owners land on /activate ready to claim immediately.
    redirect(dest);
  }

  // outcome.kind === "wrong_account" — a real device, assigned to someone else. Never reveal
  // who owns it or any other detail; never permit a claim attempt from here.
  return (
    <>
      <SiteHeader locale="en" />
      <Section className="pt-20 pb-24 max-w-sm text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight">This SnapLink can't be activated by this account</h1>
        <p className="text-ink-soft mt-3 text-sm">If you believe this is your device, sign in with the account you used to buy it.</p>
      </Section>
    </>
  );
}

"use server";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { requireUserId } from "@/lib/auth";
import { destinations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { claimError, isValidDeviceCode, normalizeDeviceCode } from "@/lib/device-lifecycle";

/**
 * Claim a physical device to one of the caller's profiles. Persists the
 * device→destination→profile link so /d/[token] resolves after restart.
 * DB-backed when wired; demo no-op otherwise.
 */
export async function claimDevice(
  deviceCode: string, profileId: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const uid = await requireUserId();
    if (!db) return { ok: false, error: "Activation requires a database connection" };

    // ownership: profile must belong to caller
    const profile = await repo.profiles.getOwned(profileId, uid);
    if (!profile) return { ok: false, error: "Not your profile" };

    if (!isValidDeviceCode(deviceCode)) return { ok: false, error: "Device code not found" };
    const device = await repo.devices.byToken(normalizeDeviceCode(deviceCode));
    const deviceError = claimError({ exists: Boolean(device), assignedUserId: device?.assignedUserId, userId: uid, status: device?.status });
    if (deviceError || !device) return { ok: false, error: deviceError ?? "Device code not found" };

    // ensure a destination for this profile, then point the device at it
    const [existingDest] = await db.select().from(destinations)
      .where(eq(destinations.profileId, profileId)).limit(1);
    if (!existingDest) return { ok: false, error: "Profile destination is missing" };
    const claimed = await repo.devices.claim(device.id, profileId, existingDest.id, uid);
    if (!claimed) return { ok: false, error: "Device could not be claimed" };
    return { ok: true, token: existingDest.token };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

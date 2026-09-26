import { repo } from "@/db/repo";
import type { PingSource } from "@/lib/device-lifecycle";
import { hashClientIp, normalizeUserAgent } from "@/lib/privacy";

/**
 * NFC PING — the post-redirect persistence seam for /t/[token].
 *
 * The visitor's redirect must never wait on, or be broken by, analytics. So the page
 * resolves the device, captures the request metadata it needs, registers this work
 * with after(), and redirects immediately. Everything here runs AFTER the response has
 * been flushed, on the platform's waitUntil budget.
 *
 * Every write is independently guarded and NEVER rethrows: a failed Ping INSERT must
 * not become an unhandled rejection, must not block the lastSeenAt update, and must
 * not be able to surface as an error page.
 */

export interface TouchpointPingInput {
  deviceId: string;
  profileId: string;
  type: "tap" | "qr_scan";
  pingSource: PingSource;
  ipHash: string | null;
  userAgent: string | null;
}

/**
 * Captures everything the post-response write needs from the live request, so the
 * after() callback depends on no request scope of its own. Called during render, on
 * the critical path — every step here is in-memory and non-blocking.
 */
export function buildTouchpointPingInput(input: {
  deviceId: string;
  profileId: string;
  pingSource: PingSource;
  headers: Headers;
}): TouchpointPingInput {
  return {
    deviceId: input.deviceId,
    profileId: input.profileId,
    // "qr" is a scan; everything else that resolved a real device is a tap.
    type: input.pingSource === "qr" ? "qr_scan" : "tap",
    pingSource: input.pingSource,
    ipHash: hashClientIp(input.headers),
    userAgent: normalizeUserAgent(input.headers),
  };
}

/**
 * Runs one persistence step, swallowing and logging any failure.
 *
 * Logs only the stage, the source, and the error message — never the raw IP, never
 * AUTH_SECRET, never the user agent, never profile data.
 */
async function guarded(stage: "insert" | "last_seen", pingSource: PingSource, work: () => Promise<unknown>) {
  try {
    await work();
  } catch (error) {
    console.error("nfc_ping_persist_failed", {
      stage,
      pingSource,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Persists one physical Ping and refreshes the device's lastSeenAt.
 *
 * Best-effort by design: this is analytics, and the visitor is already on their way to
 * the profile. Returns normally even when the database is unavailable.
 */
export async function persistTouchpointPing(input: TouchpointPingInput): Promise<void> {
  await guarded("insert", input.pingSource, () =>
    repo.pings.record({
      deviceId: input.deviceId,
      profileId: input.profileId,
      type: input.type,
      pingSource: input.pingSource,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
    }),
  );
  // Independent of the INSERT above — a failure in one must not skip the other.
  await guarded("last_seen", input.pingSource, () => repo.pings.touchDevice(input.deviceId));
}

import { auth } from "@/lib/auth-config";
import { db } from "@/db";
import { getOwnedProfile, getOwnedProfiles, OWNER_USER_ID, type DemoProfile } from "@/db/demo";
import { repo } from "@/db/repo";

/**
 * AUTH / OWNERSHIP — real Auth.js session when wired; demo fallback when
 * DATABASE_URL is unset so the app still boots. Every Studio mutation MUST
 * go through requireOwnedProfile().
 */

export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;
  if (!db) return OWNER_USER_ID; // demo fallback only when DB not wired
  return null;
}

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

export async function requireUserId(): Promise<string> {
  const uid = await getSessionUserId();
  if (!uid) throw new AuthError("Not authenticated");
  return uid;
}

/** Throws ForbiddenError if the profile isn't owned by the caller. */
export async function requireOwnedProfile(profileId: string) {
  const uid = await requireUserId();
  if (db) {
    const p = await repo.profiles.getOwned(profileId, uid);
    if (!p) throw new ForbiddenError("Not your profile");
    return p;
  }
  const p = getOwnedProfile(profileId, uid);
  if (!p) throw new ForbiddenError("Not your profile");
  return p as unknown as Awaited<ReturnType<typeof repo.profiles.getOwned>>;
}

export async function listMyProfiles() {
  const uid = await requireUserId();
  if (db) return repo.profiles.listByUser(uid);
  return getOwnedProfiles(uid) as unknown as Awaited<ReturnType<typeof repo.profiles.listByUser>>;
}

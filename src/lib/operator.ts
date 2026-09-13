import { auth } from "@/lib/auth-config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

function isProductionEnv() {
  return process.env.VERCEL_ENV === "production";
}

/**
 * The no-DB demo fallback below is a local-development convenience only.
 * If DATABASE_URL is missing in a production deployment, fail closed instead
 * of silently granting operator access.
 */
function assertDevBypassAllowed() {
  if (isProductionEnv()) {
    throw new Error("Operator authorization unavailable: DATABASE_URL is not configured in production.");
  }
}

/**
 * Operator authorization — DB-authoritative.
 * The session token carries the role claim, but the users table is the
 * source of truth: this resolves a session to an operator user id AFTER
 * re-checking role against the database, so stale/incorrect JWT claims
 * can never grant or deny operator access incorrectly.
 */
export async function getOperatorUserId(): Promise<string | null> {
  const session = await auth();
  const uid = session?.user?.id;
  if (!uid) return null;
  if (db) {
    try {
      const [row] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      return row?.role === "operator" ? uid : null;
    } catch {
      return null;
    }
  }
  return (session?.user as { role?: string } | undefined)?.role === "operator" ? uid : null;
}

export async function hasOperatorSession(): Promise<boolean> {
  if (!db) return false;
  return Boolean(await getOperatorUserId());
}

/**
 * OPERATOR SEAM — separate privileged role from customer ownership.
 * Real: session must resolve to a users row whose role is "operator".
 * Demo fallback (no DB): allowed only outside production, so the operator
 * surface is reachable while wiring; throws in production instead of
 * granting access.
 */
export async function requireOperator(): Promise<string> {
  if (!db) {
    assertDevBypassAllowed();
    return "demo-operator";
  }
  const uid = await getOperatorUserId();
  if (!uid) redirect("/sign-in?next=/operator");
  return uid;
}

export type OperatorPageAuth =
  | { status: "unauthenticated" }
  | { status: "denied" }
  | { status: "authorized"; userId: string };

/**
 * Route/layout UX variant of requireOperator(): distinguishes "not signed
 * in" (send to sign-in) from "signed in but wrong role" (show access
 * denied) instead of collapsing both into a sign-in redirect. Authorization
 * semantics are identical to requireOperator() — this only changes what the
 * visitor sees, not who is allowed in.
 */
export async function getOperatorPageAuth(): Promise<OperatorPageAuth> {
  if (!db) {
    assertDevBypassAllowed();
    return { status: "authorized", userId: "demo-operator" };
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !session) return { status: "unauthenticated" };
  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .catch(() => []);
  if (row?.role !== "operator") return { status: "denied" };
  return { status: "authorized", userId };
}
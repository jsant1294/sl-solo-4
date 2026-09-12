import { auth } from "@/lib/auth-config";
import { db } from "@/db";
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

export async function hasOperatorSession(): Promise<boolean> {
  if (!db) return false;
  const session = await auth();
  return Boolean(session?.user?.id && (session.user as { role?: string }).role === "operator");
}

/**
 * OPERATOR SEAM — separate privileged role from customer ownership.
 * Real: checks session.user.role === "operator". Demo fallback (no DB):
 * allowed only outside production, so the operator surface is reachable
 * while wiring; throws in production instead of granting access.
 */
export async function requireOperator(): Promise<string> {
  if (!db) {
    assertDevBypassAllowed();
    return "demo-operator";
  }
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = session?.user?.id;
  if (role !== "operator" || !userId) redirect("/sign-in?next=/operator");
  return userId;
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
  const role = (session.user as { role?: string }).role;
  if (role !== "operator") return { status: "denied" };
  return { status: "authorized", userId };
}

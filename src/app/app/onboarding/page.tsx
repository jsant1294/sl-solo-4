import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { destinations, orders, profiles, users } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { checkUsername } from "@/lib/username";
import { shouldMaterializeEntitlementsFor } from "@/lib/entitlements";
import { nanoid } from "nanoid";
import { and, eq, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function FinishOnboarding() {
  const uid = await requireUserId();
  if (!db) redirect("/app");
  const jar = await cookies();
  const raw = jar.get("sl_onboarding")?.value;
  if (!raw) redirect("/app");

  let draft: { name?: unknown; username?: unknown; locale?: unknown };
  try { draft = JSON.parse(raw); } catch { jar.delete("sl_onboarding"); redirect("/app"); }
  const name = typeof draft.name === "string" ? draft.name.trim().slice(0, 80) : "";
  const checked = checkUsername(typeof draft.username === "string" ? draft.username : "");
  const locale = draft.locale === "es" ? "es" : "en";
  if (!name || !checked.ok) { jar.delete("sl_onboarding"); redirect("/app/create"); }

  // Order linking uses ONLY the authenticated account's own verified email (from `users`,
  // resolved via the Auth.js session/magic-link, never a browser-submitted field) — a guest
  // order can only ever be claimed by someone who later authenticates as that exact email.
  const [account] = await db.select({ email: users.email }).from(users).where(eq(users.id, uid)).limit(1);
  if (account?.email) {
    // .returning() tells us exactly which orders just transitioned from guest (userId NULL) to
    // this account, so entitlement materialization only ever runs on orders newly linked here —
    // never re-processing orders that were already linked (grantForPaidOrder is idempotent via
    // entitlements' UNIQUE(userId,key) + ON CONFLICT DO NOTHING regardless, but this also avoids
    // needless repeat work on every onboarding visit).
    const linked = await db.update(orders).set({ userId: uid })
      .where(and(eq(orders.email, account.email.toLowerCase()), isNull(orders.userId)))
      .returning({ id: orders.id, paymentState: orders.paymentState });
    for (const order of linked) {
      if (shouldMaterializeEntitlementsFor(order.paymentState)) {
        await repo.entitlements.grantForPaidOrder(order.id, uid);
      }
    }
  }

  const existingProfiles = await repo.profiles.listByUser(uid);
  if (existingProfiles.length) { jar.delete("sl_onboarding"); redirect(`/app/profiles/${existingProfiles[0].id}`); }
  if (await repo.profiles.byUsername(checked.value)) { jar.delete("sl_onboarding"); redirect("/app/create?username=taken"); }

  const profile = await db.transaction(async (tx) => {
    await tx.update(users).set({ name, locale }).where(eq(users.id, uid));
    const [created] = await tx.insert(profiles).values({
      userId: uid, type: "personal", status: "draft", username: checked.value,
      displayName: name, locale, data: {},
    }).returning();
    await tx.insert(destinations).values({ token: `dst_${nanoid(10)}`, profileId: created.id, active: true });
    return created;
  });
  jar.delete("sl_onboarding");
  redirect(`/app/profiles/${profile.id}?lang=${locale}`);
}

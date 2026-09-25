import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { getSessionUserId } from "@/lib/auth";
import { hasEntitlement, meetsEntitlementRequirement, ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";
import { repo } from "@/db/repo";
import { db } from "@/db";
import { redirect } from "next/navigation";

// Server layout; locale resolved per-page from ?lang and passed to nav via client hook.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/sign-in?next=/app");
  const showNetworking = await hasEntitlement(userId, ENTITLEMENT_SOLO_NETWORKING);
  let showResume = false;
  if (db) {
    const resumeSettings = await repo.resumeSettings.get();
    const granted = resumeSettings.requiredEntitlement ? await hasEntitlement(userId, resumeSettings.requiredEntitlement) : false;
    showResume = resumeSettings.featureEnabled && meetsEntitlementRequirement(resumeSettings.requiredEntitlement, granted);
  }
  return (
    <div className="min-h-screen bg-bg">
      <Suspense fallback={<div className="hidden sm:block fixed left-0 top-0 h-full w-20 border-r border-line" />}>
        <AppNav showNetworking={showNetworking} showResume={showResume} />
      </Suspense>
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-28 sm:pb-16 sm:pl-24">{children}</main>
    </div>
  );
}

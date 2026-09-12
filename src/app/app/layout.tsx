import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { getSessionUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

// Server layout; locale resolved per-page from ?lang and passed to nav via client hook.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSessionUserId())) redirect("/sign-in?next=/app");
  return (
    <div className="min-h-screen bg-bg">
      <Suspense fallback={<div className="hidden sm:block fixed left-0 top-0 h-full w-20 border-r border-line" />}>
        <AppNav />
      </Suspense>
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-28 sm:pb-16 sm:pl-24">{children}</main>
    </div>
  );
}

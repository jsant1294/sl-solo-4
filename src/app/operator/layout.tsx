import Link from "next/link";
import { redirect } from "next/navigation";
import { getOperatorPageAuth } from "@/lib/operator";
import { signOut as authSignOut } from "@/lib/auth-config";

async function signOutOperator() {
  "use server";
  await authSignOut({ redirectTo: "/sign-in?next=/operator" });
}

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pageAuth = await getOperatorPageAuth();
  if (pageAuth.status === "unauthenticated") redirect("/sign-in?next=/operator");
  if (pageAuth.status === "denied") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-widest text-gold mb-2">SnapLink Operator</p>
          <h1 className="font-display text-2xl font-semibold text-ink">Operator access required</h1>
          <p className="mt-3 text-sm text-ink-soft">You&apos;re signed in, but this account does not have operator access.</p>
          <form action={signOutOperator}><button className="mt-6 rounded-full bg-ink text-bg px-6 py-3 text-sm font-medium hover:bg-gold transition-colors">Sign out</button></form>
        </div>
      </div>
    );
  }
  const nav = [
    { href: "/operator", label: "Dashboard" },
    { href: "/operator/orders", label: "Orders" },
    { href: "/operator/profiles", label: "Profiles" },
    { href: "/operator/leads", label: "Leads" },
    { href: "/operator/networking", label: "Networking" },
    { href: "/operator/resume", label: "Resume" },
    { href: "/operator/products", label: "Products" },
    { href: "/operator/storefront", label: "Storefront" },
    { href: "/operator/purposes", label: "Purposes" },
    { href: "/operator/samples", label: "Demo samples" },
    { href: "/operator/collections", label: "Collections" },
    { href: "/operator/plans", label: "Plans" },
    { href: "/operator/media", label: "Media" },
    { href: "/operator/devices", label: "Devices" },
    { href: "/operator/launch", label: "Launch" },
  ];
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-bg-raised">
        <div className="mx-auto max-w-5xl px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-display font-semibold text-ink">SnapLink <span className="font-mono text-[0.6rem] uppercase tracking-widest text-gold border border-gold/40 rounded-sm px-1.5 py-0.5">Operator</span></span>
            <nav className="hidden sm:flex gap-5 text-sm">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="text-ink-soft hover:text-ink no-underline">{n.label}</Link>
              ))}
            </nav>
          </div>
          <form action={signOutOperator}><button className="text-xs text-ink-faint hover:text-ink">Sign out</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}

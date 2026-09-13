import { db } from "@/db";
import { repo } from "@/db/repo";
import { launchConfiguration } from "@/lib/launch-config";
import { requireOperator } from "@/lib/operator";

export const dynamic = "force-dynamic";

export default async function LaunchReadiness() {
  await requireOperator();
  const checks = launchConfiguration();
  const notifications = db ? await repo.notifications.counts() : { pending: 0, failed: 0 };
  const orders = db ? await repo.orders.launchCounts() : { pendingPayments: 0, paidWithIssues: 0, paidUnfulfilled: 0 };
  const ready = checks.every((check) => check.ok) && notifications.failed === 0 && orders.paidWithIssues === 0;
  return <div>
    <div className="flex items-center justify-between"><div><p className="font-mono text-xs uppercase tracking-widest text-gold">Release gate</p><h1 className="mt-2 font-display text-3xl font-semibold">SOLO launch readiness</h1></div><span className={`rounded-full px-4 py-2 text-sm ${ready ? "bg-ok/15 text-ok" : "bg-err/10 text-err"}`}>{ready ? "Configuration ready" : "Payments locked"}</span></div>
    <div className="mt-8 grid gap-3">{checks.map((check) => <div key={check.key} className="flex gap-4 rounded-xl border border-line bg-bg-raised p-4"><span className={check.ok ? "text-ok" : "text-err"}>{check.ok ? "PASS" : "NEEDS CONFIGURATION"}</span><div><p className="font-medium">{check.key.replaceAll("_", " ")}</p><p className="text-sm text-ink-soft">{check.message}</p></div></div>)}</div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[
      ["Pending email", notifications.pending], ["Email retries", notifications.failed], ["Stale payments", orders.pendingPayments], ["Paid order issues", orders.paidWithIssues], ["Awaiting production", orders.paidUnfulfilled],
    ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-line bg-bg-raised p-4"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-ink-faint">{label}</p></div>)}</div>
    <p className="mt-8 rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm">Configuration status is not approval to launch. Keep PUBLIC_LIVE_PAYMENTS_ENABLED=false until the production purchase, webhook, email, fulfillment, activation, and refund evidence is recorded.</p>
  </div>;
}

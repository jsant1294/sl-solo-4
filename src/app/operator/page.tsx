import Link from "next/link";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";

export default async function OperatorDashboard() {
  const orders = await data.orders();
  const paid = orders.filter((o) => o.paymentState === "paid");
  const needsProduction = paid.filter((o) => o.fulfillmentState === "unfulfilled");
  const inProduction = paid.filter((o) => o.fulfillmentState === "production");
  const readyToShip = paid.filter((o) => o.fulfillmentState === "ready_to_ship");
  const shipped = paid.filter((o) => ["shipped", "delivered"].includes(o.fulfillmentState));

  const cards = [
    { label: "Needs production", n: needsProduction.length, tone: "warn" },
    { label: "In production", n: inProduction.length, tone: "ink" },
    { label: "Ready to ship", n: readyToShip.length, tone: "ok" },
    { label: "Shipped", n: shipped.length, tone: "faint" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-line bg-bg-raised p-5">
            <p className="font-display text-3xl font-semibold">{c.n}</p>
            <p className="text-xs text-ink-faint mt-1">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-medium">New paid orders</h2>
        <Link href="/operator/orders" className="text-sm text-ink-soft hover:text-gold no-underline">All orders →</Link>
      </div>
      <div className="flex flex-col gap-2">
        {needsProduction.length === 0 && <p className="text-sm text-ink-faint">Nothing awaiting production.</p>}
        {needsProduction.map((o) => (
          <Link key={o.id} href={`/operator/orders/${o.id}`}
            className="flex items-center justify-between rounded-lg border border-line bg-bg-raised px-4 py-3 no-underline hover:border-gold/50 transition-colors">
            <span className="font-mono text-sm">{o.orderNumber}</span>
            <span className="text-sm text-ink-soft">{o.items.length} item{o.items.length > 1 ? "s" : ""}</span>
            <span className="font-mono text-sm text-gold">{dollars(o.total)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

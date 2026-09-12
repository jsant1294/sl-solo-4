import Link from "next/link";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
export const dynamic = "force-dynamic";

const fulfillLabel: Record<string, string> = {
  unfulfilled: "Needs production", production: "In production", ready_to_ship: "Ready to ship",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export default async function OperatorOrders() {
  const orders = (await data.orders()).sort((a, b) => {
    const aNeedsWork = a.paymentState === "paid" && a.fulfillmentState === "unfulfilled" ? 1 : 0;
    const bNeedsWork = b.paymentState === "paid" && b.fulfillmentState === "unfulfilled" ? 1 : 0;
    return bNeedsWork - aNeedsWork || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight mb-6">Orders</h1>
      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-sunken text-ink-faint">
            <tr>
              <th className="text-left font-medium px-4 py-3">Order</th>
              <th className="text-left font-medium px-4 py-3 hidden sm:table-cell">Customer</th>
              <th className="text-left font-medium px-4 py-3">Payment</th>
              <th className="text-left font-medium px-4 py-3">Fulfillment</th>
              <th className="text-right font-medium px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line hover:bg-bg-raised">
                <td className="px-4 py-3"><Link href={`/operator/orders/${o.id}`} className="font-mono text-gold no-underline hover:underline">{o.orderNumber}</Link></td>
                <td className="px-4 py-3 hidden sm:table-cell text-ink-soft">{o.email}</td>
                <td className="px-4 py-3"><span className={o.paymentState === "paid" ? "text-ok" : "text-warn"}>{o.paymentState}</span></td>
                <td className="px-4 py-3 text-ink-soft">{fulfillLabel[o.fulfillmentState]}{o.paymentState === "paid" && o.fulfillmentState === "unfulfilled" ? " · Action required" : ""}</td>
                <td className="px-4 py-3 text-right font-mono">{dollars(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

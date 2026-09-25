import Link from "next/link";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { dollars } from "@/db/commerce-demo";
import { data } from "@/lib/data";
import { FulfillmentActions } from "./fulfillment-ui";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { profiles } from "@/db/schema";
import { repairShippingAddress } from "../../fulfillment-actions";
import { requireOperator } from "@/lib/operator";
export const dynamic = "force-dynamic";

export default async function OrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ repairError?: string; repaired?: string }> }) {
  await requireOperator();
  const { id } = await params;
  const query = await searchParams;
  const o = await data.orderById(id);
  if (!o) notFound();
  const itemDevices = new Map((await Promise.all(o.items.map(async (item) => item.deviceId && db ? repo.devices.byId(item.deviceId) : undefined))).filter(Boolean).map((device) => [device!.id, device!]));
  // Lets the operator answer "did this customer activate their SnapLink?" without SQL — reuses
  // the same devices/profiles data the customer-facing activation flow relies on, no new schema.
  const claimedProfileIds = [...new Set([...itemDevices.values()].map((d) => d.profileId).filter((x): x is string => Boolean(x)))];
  const profilesById = new Map<string, { displayName: string }>();
  if (db && claimedProfileIds.length) {
    const rows = await db.select({ id: profiles.id, displayName: profiles.displayName }).from(profiles).where(inArray(profiles.id, claimedProfileIds));
    for (const r of rows) profilesById.set(r.id, r);
  }

  const timeline = [
    { label: "Order placed", at: o.createdAt },
    { label: "Payment received", at: o.paidAt },
    { label: "Shipped", at: o.shippedAt },
    { label: "Delivered", at: o.deliveredAt },
  ].filter((t) => t.at);

  return (
    <div>
      <Link href="/operator/orders" className="text-sm text-ink-soft hover:text-gold no-underline">← Orders</Link>
      <div className="flex items-baseline justify-between gap-4 mt-4 mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Order {o.orderNumber}</h1>
        <span className="font-mono text-lg text-gold">{dollars(o.total)}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="flex flex-col gap-5">
          <Panel title="Customer">
            <p className="text-sm">{o.email}</p>
            {o.phone && <p className="text-sm text-ink-soft">{o.phone}</p>}
          </Panel>
          {o.address && (
            <Panel title="Ship to">
              <p className="text-sm">{o.address.name}</p>
              <p className="text-sm text-ink-soft">{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ""}</p>
              <p className="text-sm text-ink-soft">{o.address.city}, {o.address.region} {o.address.postal}</p>
            </Panel>
          )}
          <Panel title="Items">
            <div className="flex flex-col gap-3">
              {o.items.map((it) => {
                const device = it.deviceId ? itemDevices.get(it.deviceId) : undefined;
                const profile = device?.profileId ? profilesById.get(device.profileId) : undefined;
                return (
                <div key={it.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{it.quantity}× {it.productName}</p>
                    <p className="text-xs text-ink-faint">{it.variantLabel}{it.skuSnapshot ? ` · ${it.skuSnapshot}` : ""}{it.personalization ? ` · "${it.personalization}"` : ""}</p>
                    {it.customArtPriceCents !== null && (
                      <div className="text-xs mt-1 rounded-md border border-gold/40 bg-gold/5 px-2 py-2 max-w-md flex items-start gap-2">
                        {it.customArtFileUrl && <img src={it.customArtFileUrl} alt="" className="h-12 w-12 rounded object-cover border border-line-strong shrink-0"/>}
                        <p>
                          <span className="font-mono text-gold">Touchpoint Art +{dollars(it.customArtPriceCents)}</span>
                          {it.customArtNotes && <span className="text-ink-soft"> — {it.customArtNotes}</span>}
                          {it.customArtFileUrl && <><br/><a href={it.customArtFileUrl} target="_blank" rel="noopener noreferrer" className="text-ink-soft underline">View full reference image</a></>}
                        </p>
                      </div>
                    )}
                    {!device && <p className="text-xs mt-1 text-warn">Device not assigned</p>}
                    {device && device.status === "paired" && (
                      <p className="text-xs mt-1 font-mono text-ok">
                        Device {device.deviceCode} · Active
                        {profile && ` · Profile: ${profile.displayName}`}
                        {device.activatedAt && ` · Activated ${new Date(device.activatedAt).toLocaleDateString()}`}
                      </p>
                    )}
                    {device && device.status !== "paired" && (
                      <p className="text-xs mt-1 font-mono text-warn">
                        Device {device.deviceCode} · {device.status === "assigned" ? "Assigned — waiting for customer activation" : device.status}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-sm">{dollars(it.unitPrice)}</span>
                </div>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          <Panel title="Status">
            <p className="text-sm mb-1">Payment: <span className={o.paymentState === "paid" ? "text-ok" : "text-warn"}>{o.paymentState}</span></p>
            <p className="text-sm">Fulfillment: <span className="text-ink-soft">{o.fulfillmentState}</span></p>
            <p className="text-sm mt-1">Subtotal: <span className="text-ink-soft">{dollars(o.subtotal)}</span></p>
            <p className="text-sm mt-1">Shipping: <span className="text-ink-soft">{dollars(Math.max(0, o.total - o.subtotal))}</span></p>
            {o.fulfillmentIssue && <p className="mt-2 text-sm text-err">Issue: {o.fulfillmentIssue}</p>}
          </Panel>
          {o.fulfillmentIssue === "shipping_address_missing" && <Panel title="Repair shipping address"><form action={repairShippingAddress.bind(null, o.id)} className="grid gap-2">{query.repairError && <p className="text-xs text-err">{query.repairError}</p>}<input required name="name" defaultValue={o.address?.name ?? ""} placeholder="Full name" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><input required name="line1" defaultValue={o.address?.line1 ?? ""} placeholder="Address" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><input name="line2" defaultValue={o.address?.line2 ?? ""} placeholder="Apt / suite" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><div className="grid grid-cols-2 gap-2"><input required name="city" defaultValue={o.address?.city ?? ""} placeholder="City" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><input required name="region" defaultValue={o.address?.region ?? ""} placeholder="State / region" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/></div><div className="grid grid-cols-2 gap-2"><input required name="postal" defaultValue={o.address?.postal ?? ""} placeholder="Postal code" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><input required name="country" defaultValue={o.address?.country ?? "US"} placeholder="US" maxLength={2} className="rounded-md border border-line bg-bg px-3 py-2 text-sm uppercase"/></div><input name="phone" defaultValue={o.address?.phone ?? o.phone ?? ""} placeholder="Phone" className="rounded-md border border-line bg-bg px-3 py-2 text-sm"/><button className="rounded-full bg-ink py-2.5 text-sm text-bg">Save address and clear issue</button></form></Panel>}
          {query.repaired && <p className="text-sm text-ok">Shipping address repaired.</p>}
          <FulfillmentActions order={{ id: o.id, orderNumber: o.orderNumber, fulfillmentState: o.fulfillmentState, paymentState: o.paymentState,
            items: o.items.map((i) => ({ id: i.id, productName: `${i.productName}${i.variantLabel ? ` / ${i.variantLabel}` : ""}${i.skuSnapshot ? ` / ${i.skuSnapshot}` : ""}`, deviceId: i.deviceId })),
            tracking: o.trackingNumber, carrier: o.trackingCarrier }} />
          {timeline.length > 0 && (
            <Panel title="Timeline">
              <div className="flex flex-col gap-2">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <span className="text-ink-soft">{t.label}</span>
                    <span className="text-ink-faint ml-auto font-mono">{new Date(t.at!).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg-raised p-5">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint mb-3">{title}</p>
      {children}
    </div>
  );
}

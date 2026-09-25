"use client";
import { useState } from "react";
import { startProduction, assignDevice, markReadyToShip, markShipped, markDelivered, refundOrder } from "../../fulfillment-actions";

interface OrderVM {
  id: string; orderNumber: string; fulfillmentState: string; paymentState: string;
  items: { id: string; productName: string; deviceId: string | null }[];
  tracking: string | null; carrier: string | null;
}

export function FulfillmentActions({ order }: { order: OrderVM }) {
  const [tracking, setTracking] = useState(order.tracking ?? "");
  const [carrier, setCarrier] = useState(order.carrier ?? "USPS");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const [refundConfirmation, setRefundConfirmation] = useState("");
  const [refundMessage, setRefundMessage] = useState("");
  const s = order.fulfillmentState;
  const allAssigned = order.items.every((i) => i.deviceId);

  if (order.paymentState !== "paid") {
    return <div className="rounded-xl border border-line bg-bg-raised p-5 text-sm text-ink-faint">Awaiting payment.</div>;
  }

  return (
    <div className="rounded-xl border border-line bg-bg-raised p-5 flex flex-col gap-3">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-faint">Actions</p>

      {s === "unfulfilled" && (
        <Btn onClick={() => startProduction(order.id)}>Start production</Btn>
      )}

      {s === "production" && (
        <>
          <div className="flex flex-col gap-2">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{it.productName}</span>
                {it.deviceId
                  ? <span className="text-ok text-xs font-mono">✓ {it.deviceId}</span>
                  : <div className="flex flex-col items-end gap-1"><div className="flex gap-1"><input value={codes[it.id] ?? ""} onChange={(event) => setCodes((current) => ({ ...current, [it.id]: event.target.value }))} placeholder="SL-DEVICE-CODE" className="w-36 rounded-md border border-line bg-bg px-2 py-1 font-mono text-xs uppercase"/><button onClick={async () => { const result = await assignDevice(order.id, it.id, codes[it.id] ?? ""); setMessage((current) => ({ ...current, [it.id]: result?.ok ? "Assigned" : result?.error ?? "Assignment failed" })); }} className="text-xs text-gold hover:underline">Assign</button></div>{message[it.id] && <span className="max-w-52 text-right text-[0.65rem] text-ink-faint">{message[it.id]}</span>}</div>}
              </div>
            ))}
          </div>
          <Btn onClick={() => markReadyToShip(order.id)} disabled={!allAssigned}>
            {allAssigned ? "Ready to ship" : "Assign all devices first"}
          </Btn>
        </>
      )}

      {s === "ready_to_ship" && (
        <>
          <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number"
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-gold outline-none" />
          <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier"
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm focus:border-gold outline-none" />
          <Btn onClick={() => markShipped(order.id, tracking, carrier)} disabled={!tracking}>Mark shipped</Btn>
        </>
      )}

      {s === "shipped" && (
        <>
          <p className="text-sm text-ok">Shipped{order.tracking ? ` · ${order.tracking}` : ""}</p>
          <Btn onClick={() => markDelivered(order.id)}>Mark delivered</Btn>
        </>
      )}
      {s === "delivered" && (
        <p className="text-sm text-ok">Delivered{order.tracking ? ` · ${order.tracking}` : ""}</p>
      )}

      <div className="mt-3 border-t border-line pt-4">
        <p className="text-xs text-ink-faint">Full refund: enter {order.orderNumber} to confirm. This does not automatically disable an activated device.</p>
        <div className="mt-2 flex gap-2">
          <input value={refundConfirmation} onChange={(event) => setRefundConfirmation(event.target.value)} placeholder={order.orderNumber}
            className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm" />
          <button disabled={refundConfirmation !== order.orderNumber} onClick={async () => { const result = await refundOrder(order.id, refundConfirmation); setRefundMessage(result.ok ? "Refund submitted" : result.error); }}
            className="rounded-lg border border-err/40 px-3 py-2 text-xs text-err disabled:opacity-40">Refund</button>
        </div>
        {refundMessage && <p className="mt-2 text-xs text-ink-faint">{refundMessage}</p>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-full bg-ink text-bg py-2.5 text-sm font-medium hover:bg-gold transition-colors disabled:opacity-40 disabled:pointer-events-none">
      {children}
    </button>
  );
}

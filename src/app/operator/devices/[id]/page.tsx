import { notFound } from "next/navigation";
import { repo } from "@/db/repo";
import { updateDevice, createReplacement } from "../actions";
import { operatorDeviceTransitions } from "@/lib/device-lifecycle";
import { requireOperator } from "@/lib/operator";
const input = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm";
export default async function DeviceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  await requireOperator();
  const device = await repo.devices.byId((await params).id); if (!device) notFound();
  const query = await searchParams;
  return <div className="max-w-2xl"><p className="text-xs font-mono uppercase tracking-widest text-gold">Device registry</p><h1 className="font-display text-3xl mt-2">{device.deviceCode}</h1><div className="rounded-xl border border-line bg-bg-raised p-5 mt-7 grid sm:grid-cols-2 gap-4 text-sm"><Field k="Hardware" v={device.type}/><Field k="Product ID" v={device.hardwareProductId ?? device.productId}/><Field k="Variant ID" v={device.hardwareVariantId}/><Field k="SKU" v={device.sku}/><Field k="Order item" v={device.orderItemId}/><Field k="Destination" v={device.destinationId}/><Field k="Profile" v={device.profileId}/><Field k="Customer" v={device.assignedUserId}/><Field k="Physical URL" v={`/t/${device.deviceCode}`}/><Field k="Assigned" v={device.assignedAt?.toLocaleString()}/><Field k="Activated" v={device.activatedAt?.toLocaleString()}/><Field k="Last seen" v={device.lastSeenAt?.toLocaleString()}/></div>
    <div className="mt-5 flex items-center gap-4 rounded-xl border border-line bg-bg-raised p-5"><img src={`/operator/devices/${device.id}/qr`} alt="Physical device QR" className="h-28 w-28 rounded-md border border-line"/><div><p className="text-sm font-medium">Physical NFC / QR</p><p className="mt-1 break-all font-mono text-xs">{`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/t/${device.deviceCode}`}</p><a href={`/operator/devices/${device.id}/qr?download=1`} className="mt-2 inline-block text-xs text-gold">Download physical QR</a></div></div>
    <form action={updateDevice} className="rounded-xl border border-line bg-bg-raised p-5 mt-5 grid sm:grid-cols-2 gap-4"><input type="hidden" name="id" value={device.id}/>{query.error && <p className="sm:col-span-2 text-sm text-err">{query.error}</p>}<label className="grid gap-1 text-xs text-ink-soft">Label<input className={input} name="label" defaultValue={device.label ?? ""}/></label><label className="grid gap-1 text-xs text-ink-soft">Status<select className={input} name="status" defaultValue={device.status}>{operatorDeviceTransitions(device.status).map((x) => <option key={x}>{x}</option>)}</select></label><button className="sm:col-span-2 rounded-md bg-ink text-bg py-2.5">Save device</button></form>
    <form action={createReplacement} className="mt-5"><input type="hidden" name="id" value={device.id}/><button disabled className="rounded-md border border-line-strong px-4 py-2 text-sm opacity-50">Replacement workflow unavailable for launch</button></form>
  </div>;
}
function Field({ k, v }: { k: string; v?: string | null }) { return <div><p className="text-xs text-ink-faint">{k}</p><p className="font-mono mt-1 break-all">{v || "—"}</p></div>; }

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireOperator } from "@/lib/operator";
import { repo } from "@/db/repo";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const device = await repo.devices.byId((await params).id);
  if (!device) return new NextResponse("Not found", { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const physicalUrl = `${origin}/t/${encodeURIComponent(device.deviceCode)}?s=qr`;
  const svg = await QRCode.toString(physicalUrl, { type: "svg", margin: 1, width: 512, color: { dark: "#14120F", light: "#F8F6F1" } });
  const download = new URL(request.url).searchParams.has("download");
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, no-store", ...(download ? { "content-disposition": `attachment; filename="snaplink-device-${device.deviceCode}.svg"` } : {}) } });
}

import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { data } from "@/lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await data.resolveDestination(token))) return new NextResponse("Not found", { status: 404 });
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const svg = await QRCode.toString(`${origin}/d/${token}?s=qr`, { type: "svg", margin: 1, width: 512, color: { dark: "#14120F", light: "#F8F6F1" } });
  const download = new URL(request.url).searchParams.has("download");
  return new NextResponse(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, max-age=300", ...(download ? { "content-disposition": `attachment; filename="snaplink-${token}.svg"` } : {}) } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { repo } from "@/db/repo";

const schema = z.object({
  type: z.enum([
    "video_impression", "video_start", "video_complete", "video_cta_click", "product_view", "checkout_initiated", "purchase",
    "purpose_view", "purpose_selected", "purpose_modal_open", "purpose_product_clicked", "purpose_all_hardware_clicked",
    "resume_view", "resume_share", "resume_download", "resume_contact_click",
  ]),
  productId: z.string().optional(), mediaId: z.string().optional(),
  purpose: z.string().optional(), locale: z.enum(["en", "es"]).optional(),
});
export async function POST(request: Request) {
  if (!db) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  // Fire-and-forget analytics — degrade silently if a schema migration
  // (e.g. the purpose/locale columns) hasn't landed in this environment yet.
  await repo.commerce.record(parsed.data).catch(() => undefined);
  return new NextResponse(null, { status: 204 });
}

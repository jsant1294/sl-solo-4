import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { repo } from "@/db/repo";

const events = z.enum(["contact_orb_opened", "call_clicked", "sms_clicked", "whatsapp_clicked", "messenger_clicked", "telegram_clicked", "viber_clicked", "line_clicked", "snapchat_clicked", "email_clicked", "vcard_downloaded", "custom_contact_clicked", "social_link_clicked", "profile_shared", "pay_opened", "payment_method_clicked"]);
const inputSchema = z.object({ username: z.string().min(1).max(80), event: events });

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    if (!db) return NextResponse.json({ ok: true });
    const profile = await repo.profiles.byUsername(input.username);
    if (!profile || profile.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });
    await repo.events.record(profile.id, "contact", input.event);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
}

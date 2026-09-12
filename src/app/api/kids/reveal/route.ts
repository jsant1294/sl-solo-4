import { NextResponse } from "next/server";
import { asKidsData } from "@/lib/profile-data";
import { data } from "@/lib/data";
import { db } from "@/db";
import { repo } from "@/db/repo";

/**
 * Reveal a single guardian phone on explicit intent (button tap).
 * Numbers are NEVER rendered into the public Kids page HTML — they are
 * fetched here only when a visitor acts. Also logs guardian_call_click.
 * @wire: rate-limit + optional relay-number masking at commerce tier.
 */
export async function POST(req: Request) {
  const { username, priority } = await req.json();
  const profile = await data.profileByUsername(String(username));
  if (!profile || profile.type !== "kids" || profile.status !== "active") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const kids = asKidsData(profile.data);
  if (!kids) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const guardian = kids.guardians.find((g) => g.priority === priority);
  if (!guardian) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (db) void repo.events.record(profile.id, "guardian_call_click", "direct").catch(() => undefined);
  return NextResponse.json({ phone: guardian.phone, label: guardian.label });
}

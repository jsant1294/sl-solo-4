import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { repo } from "@/db/repo";

/**
 * Snap Track demand-capture teaser only — no product, no SKU, no checkout.
 * Just records interest so launch timing can be judged by real demand.
 */
const schema = z.object({
  email: z.string().trim().email().max(200),
  locale: z.enum(["en", "es"]).default("en"),
  company: z.string().max(200).optional(), // honeypot
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (parsed.data.company) return NextResponse.json({ ok: true }); // honeypot tripped — pretend success

  if (!db) return NextResponse.json({ ok: true });
  // Demand-capture only — if the migration hasn't landed in this environment
  // yet, degrade silently rather than surface a 500 for a "nice to have" signup.
  await repo.snapTrack.subscribe(parsed.data.email.toLowerCase(), parsed.data.locale).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

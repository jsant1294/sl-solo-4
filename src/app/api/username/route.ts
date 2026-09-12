import { NextResponse } from "next/server";
import { checkUsername } from "@/lib/username";
import { DEMO_PROFILES } from "@/db/demo";
import { db } from "@/db";
import { repo } from "@/db/repo";

// naive in-memory rate note: @wire add real rate limiting (e.g. upstash) in prod
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("u") ?? "";
  const check = checkUsername(raw);
  if (!check.ok) return NextResponse.json({ available: false, reason: check.reason });

  const taken = db ? Boolean(await repo.profiles.byUsername(check.value)) : DEMO_PROFILES.some((p) => p.username === check.value);
  return NextResponse.json({ available: !taken, value: check.value, reason: taken ? "taken" : null });
}

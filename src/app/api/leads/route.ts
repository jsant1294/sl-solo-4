import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { getDemoProfile, addDemoLead, recentDemoDuplicate } from "@/db/demo";
import { normalizePhone } from "@/lib/contact-channels";
import { createHmac } from "node:crypto";

/**
 * Public lead intake for a profile's "Send your info" form. The profile is
 * always resolved server-side from the public username — the client never
 * supplies (and this schema never accepts) a profile ID. Errors are kept
 * generic so a response can't be used to probe which usernames exist.
 */
const schema = z.object({
  username: z.string().trim().min(1).max(64),
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().max(200).optional(),
  message: z.string().trim().max(2000).optional(),
  company: z.string().max(200).optional(), // honeypot — real visitors never see or fill this
  consent: z.literal(true),
});

const DEDUPE_WINDOW_MS = 60_000;
const RATE_WINDOW_MS = 60 * 60_000;
const RATE_LIMIT = 5;
const genericError = () => NextResponse.json({ error: "We could not send your message. Please try again." }, { status: 400 });
const contactRequired = () => NextResponse.json({ error: "Add a phone number or email so we can reach you." }, { status: 400 });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return genericError();
  const { username, company, name, message, consent: _consent, ...raw } = parsed.data;

  // Honeypot tripped — report success without persisting anything.
  if (company) return NextResponse.json({ ok: true });

  const phone = raw.phone ? normalizePhone(raw.phone) ?? undefined : undefined;
  if (raw.phone && !phone) return genericError();
  const email = raw.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email) ? raw.email.toLowerCase() : undefined;
  if (raw.email && !email) return genericError();
  if (!phone && !email) return contactRequired();

  const fields = { name: name || undefined, message: message || undefined, phone: phone || undefined, email: email || undefined, source: "profile" };

  if (db) {
    const address = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const secret = process.env.AUTH_SECRET;
    if (!secret) return genericError();
    const fingerprint = createHmac("sha256", secret).update(address).digest("hex");
    if (await repo.leads.countRecentByFingerprint(fingerprint, RATE_WINDOW_MS) >= RATE_LIMIT) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }
    const profile = await repo.profiles.byUsername(username);
    if (!profile || profile.status !== "active") return genericError();
    if (await repo.leads.recentDuplicate(profile.id, { email, phone }, DEDUPE_WINDOW_MS)) return genericError();
    await repo.leads.create({ profileId: profile.id, submissionFingerprint: fingerprint, ...fields });
    await repo.events.record(profile.id, "contact", "profile");
    return NextResponse.json({ ok: true });
  }

  const profile = getDemoProfile(username);
  if (!profile || profile.status !== "active") return genericError();
  if (recentDemoDuplicate(profile.id, { email, phone }, DEDUPE_WINDOW_MS)) return genericError();
  addDemoLead({ profileId: profile.id, profileUsername: profile.username, profileDisplayName: profile.displayName, ...fields });
  return NextResponse.json({ ok: true });
}

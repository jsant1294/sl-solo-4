import { data } from "@/lib/data";
import { buildPublicVcard, vcardFilename } from "@/lib/vcard";
import { repo } from "@/db/repo";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await data.profileByUsername(username);
  if (!profile || profile.status !== "active") return new Response("Not found", { status: 404 });
  const channels = profile.contactChannels ?? [];
  const permitted = channels.some((row) => row.type === "vcard" && row.enabled && row.public);
  if (!permitted) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || url.origin;
  const body = buildPublicVcard(profile, channels, `${origin}/u/${encodeURIComponent(profile.username)}`);
  if (db) void repo.events.record(profile.id, "contact", "vcard_downloaded").catch(() => undefined);
  return new Response(body, { headers: {
    "Content-Type": "text/vcard; charset=utf-8",
    "Content-Disposition": `attachment; filename="${vcardFilename(profile.type === "kids" ? (profile.locale === "es" ? "Tutor de SnapLink" : "SnapLink Guardian") : profile.displayName)}"`,
    "Cache-Control": "no-store",
  } });
}

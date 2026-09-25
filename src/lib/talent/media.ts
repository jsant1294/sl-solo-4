import { safeWebUrl } from "./model";
/** Only exact provider hosts and validated IDs may create iframe URLs. Everything retains its external link. */
export function normalizeMedia(raw: string): { url: string; embed: string | null; direct: boolean } | null {
  if (!safeWebUrl(raw)) return null;
  const u = new URL(raw); const host = u.hostname.toLowerCase();
  let embed: string | null = null;
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
    const id = host === "youtu.be" ? u.pathname.slice(1) : u.pathname === "/watch" ? u.searchParams.get("v") : /^\/(?:embed|shorts)\/([^/]+)$/.exec(u.pathname)?.[1];
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) embed = `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const id = /^\/(?:video\/)?(\d+)$/.exec(u.pathname)?.[1];
    if (id) embed = `https://player.vimeo.com/video/${id}`;
  }
  return { url: u.href, embed, direct: /\.(mp4|webm|ogg)$/i.test(u.pathname) };
}

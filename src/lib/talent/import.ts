import { z } from "zod";
import { copy, newModule, newTalent, safeWebUrl, talentSchema, type Talent } from "./model";
const sourceSchema = z.object({ id: z.string(), username: z.string(), displayName: z.string(), links: z.array(z.object({ id: z.string().optional(), url: z.string(), label: z.string().nullish(), labelEn: z.string().nullish(), labelEs: z.string().nullish(), sortOrder: z.number().optional(), active: z.boolean().optional(), isActive: z.boolean().optional() }).passthrough()).default([]) }).passthrough();
export type ImportInventory = { slugs: string[]; assetUrls?: string[] };
/** Pure dry-run adapter: no database, network, writes, or publication. */
export function dryRunTalentImport(input: unknown, inventory: ImportInventory = { slugs: [] }) {
  const source = sourceSchema.parse(input); const warnings: string[] = []; const missingAssets: string[] = []; const unverifiedAssets: string[] = [];
  const text = (key: string) => typeof source[key] === "string" ? source[key] as string : source[key] == null ? "" : String(source[key]);
  const slug = source.username.toLowerCase();
  const collision = inventory.slugs.some(s => s.toLowerCase() === slug);
  if (collision) warnings.push(`Slug collision: ${slug}. Resolve before import; existing records are never replaced.`);
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(slug)) warnings.push("Slug requires review against the destination username policy.");
  const p = newTalent(source.displayName); p.headline = copy(text("titleEn") || text("title") || text("taglineEn") || text("tagline"), text("titleEs") || text("taglineEs"));
  p.bio = copy(text("bioEn") || text("bio"), text("bioEs"));
  if (text("template") !== "athlete" && text("profileType") !== "athlete") warnings.push("Source is not explicitly an athlete preset. Review the proposed discipline before applying.");
  p.modules.athlete = { ...newModule()!, sport: text("sport"), position: text("position"), affiliation: copy(text("teamName")) };
  function asset(value: string): string {
    if (!value) return "";
    if (!safeWebUrl(value)) { warnings.push(`Invalid or relative asset URL: ${value}`); missingAssets.push(value); return ""; }
    if (inventory.assetUrls) { if (!inventory.assetUrls.includes(value)) missingAssets.push(value); }
    else unverifiedAssets.push(value);
    return value;
  }
  p.portrait = asset(text("avatarUrl") || text("profilePhotoUrl"));
  const actionPhoto = asset(text("actionPhotoUrl")); const video = asset(text("videoUrl"));
  if (actionPhoto) p.media.push({ id: "import-action", kind: "image", url: actionPhoto, poster: "", title: copy("Performance photo", "Foto de actuación"), caption: copy(), alt: copy(source.displayName), visible: false });
  if (video) { p.media.push({ id: "import-reel", kind: "video", url: video, poster: "", title: copy("Featured reel", "Video destacado"), caption: copy(), alt: copy(), visible: false }); p.featuredReelId = "import-reel"; }
  for (const key of ["height", "weight", "gpa", "gradYear"] as const) {
    const raw = text(key); if (!raw) continue;
    const labels = { height: copy("Height", "Altura"), weight: copy("Weight", "Peso"), gpa: copy("GPA", "Promedio académico"), gradYear: copy("Graduation year", "Año de graduación") };
    let value: Talent["facts"][number]["value"] = { type: "text", value: copy(raw) };
    if (key === "height" || key === "weight") {
      const match = /^(\d+(?:\.\d+)?)\s*(cm|m|in|ft|kg|lb|lbs)$/i.exec(raw.trim());
      if (match) value = { type: "number", value: Number(match[1]), unit: match[2].toLowerCase() };
      else warnings.push(`Ambiguous ${key}: ${raw}. Raw text retained; verify units.`);
    }
    p.facts.push({ id: `import-${key}`, key, label: labels[key], value, visible: false, observedAt: "" });
  }
  const deduplicatedLinks: string[] = [];
  for (const [i, link] of [...source.links].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).entries()) {
    if (link.active === false || link.isActive === false) continue;
    if (!safeWebUrl(link.url)) { warnings.push(`Contact or unsupported link retained in source report for explicit review: ${link.url}`); continue; }
    // Preserve every link label. A matching reel URL is reported, not silently discarded.
    if (video && new URL(link.url).href === new URL(video).href) deduplicatedLinks.push(link.id || String(i));
    p.links.push({ id: `import-link-${i}`, url: link.url, label: copy(link.labelEn || link.label || "", link.labelEs || ""), visible: false });
  }
  warnings.push("Review all fact/media/document visibility; all imported items start private. Select an explicit recipient before publishing.");
  if (text("ctaType") && text("ctaType") !== "recruit") warnings.push(`Unmapped CTA: ${text("ctaType")}`);
  const mapped = new Set(["id", "username", "displayName", "links", "template", "profileType", "titleEn", "titleEs", "title", "taglineEn", "taglineEs", "tagline", "bioEn", "bioEs", "bio", "sport", "position", "teamName", "height", "weight", "gpa", "gradYear", "avatarUrl", "profilePhotoUrl", "actionPhotoUrl", "videoUrl", "ctaType", "isPublished"]);
  const unmapped = Object.fromEntries(Object.entries(source).filter(([key]) => !mapped.has(key)));
  return { dryRun: true, sourceId: source.id, destinationId: null, proposedSlug: slug, destinationUrl: `/u/${encodeURIComponent(slug)}`, collision, missingAssets, unverifiedAssets, warnings, unmapped,
    duplicateReelLinkIds: deduplicatedLinks, source: input, proposed: { status: "draft", talent: { revision: 0, draft: talentSchema.parse(p), published: null } } };
}

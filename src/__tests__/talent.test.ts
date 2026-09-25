import { describe, expect, it } from "vitest";
import { copy, newTalent, projectProfile, projectTalent, safeContactUrl, talentSchema } from "@/lib/talent/model";
import { samplePresets, talentFixture } from "@/lib/talent/fixtures";
import { normalizeMedia } from "@/lib/talent/media";
import { dryRunTalentImport } from "@/lib/talent/import";
import { buildShareModel } from "@/lib/profile-sharing";
import type { Profile } from "@/db/schema";

describe("Talent Profile contract and public privacy", () => {
  it.each(samplePresets)("renders %s from the same validated contract", preset => {
    const p = talentFixture(preset); expect(talentSchema.safeParse(p).success).toBe(true); expect(projectTalent(p).displayName).toBe(p.displayName);
  });
  it("does not require sports, academics, or measurements for actors", () => {
    const p = newTalent("An actor", "actor"); expect(p.modules).toEqual({}); expect(p.facts).toEqual([]); expect(p.primaryGoal).toBe("auditions");
  });
  it("preserves inactive discipline data through primary and theme changes", () => {
    const p = talentFixture("combined"); const before = structuredClone(p.modules);
    p.primaryDiscipline = "dancer"; p.disciplines = ["dancer"]; p.presentation.theme = "obsidian";
    const saved = talentSchema.parse(p); expect(saved.modules).toEqual(before); expect(projectTalent(saved).modules.cheer).toBeUndefined();
    saved.disciplines.push("cheer"); expect(projectTalent(saved).modules.cheer).toEqual(before.cheer);
  });
  it("removes hidden fields, contacts, documents, and draft content from public payloads and metadata", () => {
    const p = talentFixture("actor"); p.location = "SECRET_LOCATION";
    p.contacts.push({ id: "private", visible: false, role: "agent", destination: "mailto:SECRET_CONTACT@example.com", goals: ["auditions"], label: copy("Agent") });
    p.documents.push({ id: "private-pdf", visible: true, published: false, kind: "resume", url: "https://example.com/SECRET_DOCUMENT.pdf", title: copy("Resume") });
    p.facts.push({ id: "private-fact", key: "gpa", visible: false, label: copy("GPA"), value: { type: "text", value: copy("SECRET_FACT") }, observedAt: "" });
    const draft = { ...p, displayName: "SECRET_DRAFT" };
    const raw = { status: "active", locale: "en", username: "sample", id: "sample", type: "personal", displayName: "SECRET_LEGACY", email: "SECRET_EMAIL", phone: "SECRET_PHONE", data: { experience: { shareDescription: "SECRET_SHARE" }, talent: { revision: 2, draft, published: p } }, contactChannels: [{ value: "SECRET_CHANNEL" }], links: [{ url: "SECRET_LINK" }] } as unknown as Profile;
    const projected = projectProfile(raw)!;
    expect(JSON.stringify(projected)).not.toContain("SECRET");
    expect(JSON.stringify(buildShareModel(projected))).not.toContain("SECRET");
    expect(projected.displayName).toBe(p.displayName);
    expect(projectProfile({ ...raw, status: "draft" })).toBeUndefined();
    expect(projectProfile({ ...raw, status: "disabled" })).toBeUndefined();
    // A never-published Talent draft leaves the existing standard profile live, with the draft stripped.
    const legacy = projectProfile({ ...raw, displayName: "Live name", data: { keep: true, talent: { revision: 0, draft, published: null } } })!;
    expect(legacy.displayName).toBe("Live name"); expect(legacy.data).toEqual({ keep: true }); expect(JSON.stringify(legacy)).not.toContain("SECRET_DRAFT");
    expect(projectProfile({ ...raw, data: { talent: { broken: true } } })).toBeUndefined();
  });
  it("excludes all content of hidden sections, and projection is idempotent", () => {
    const p = talentFixture("combined"); p.presentation.sections = p.presentation.sections.map(s => ({ ...s, visible: false }));
    const result = projectTalent(p); expect(result.media).toEqual([]); expect(result.modules).toEqual({}); expect(result.credits).toEqual([]); expect(result.bio).toEqual(copy()); expect(result.featuredReelId).toBe("");
    expect(projectTalent(result)).toEqual(result);
  });
  it("requires an intentional public recipient for a primary CTA and blocks direct youth contact", () => {
    const p = newTalent("Sample"); p.contacts = [{ id: "c", visible: true, role: "talent", destination: "mailto:sample@example.com", label: copy(), goals: ["recruiting"] }]; p.primaryContactId = "c";
    expect(talentSchema.safeParse(p).success).toBe(true); p.youth = true; expect(talentSchema.safeParse(p).success).toBe(false);
    p.primaryContactId = ""; expect(projectTalent(p).contacts).toEqual([]); p.contacts[0].role = "guardian"; p.primaryContactId = "c"; expect(projectTalent(p).contacts).toHaveLength(1);
    p.contacts[0].visible = false; expect(talentSchema.safeParse(p).success).toBe(false);
  });
  it("rejects duplicate IDs and incomplete section configurations", () => {
    const p = talentFixture("cheer"); p.media.push(p.media[0]); expect(talentSchema.safeParse(p).success).toBe(false);
    p.media.pop(); p.presentation.sections[0] = p.presentation.sections[1]; expect(talentSchema.safeParse(p).success).toBe(false);
  });
});

describe("media and contact validation", () => {
  it("uses exact hosts and valid IDs with external fallback", () => {
    expect(normalizeMedia("https://www.youtube.com/watch?v=abcdefghijk")?.embed).toBe("https://www.youtube-nocookie.com/embed/abcdefghijk");
    expect(normalizeMedia("https://youtu.be/abcdefghijk")?.embed).toContain("abcdefghijk");
    expect(normalizeMedia("https://youtube.com.evil.test/watch?v=abcdefghijk")?.embed).toBeNull();
    expect(normalizeMedia("https://youtube.com/watch?v=invalid")?.embed).toBeNull();
    expect(normalizeMedia("https://vimeo.com/12345")?.embed).toBe("https://player.vimeo.com/video/12345");
    expect(normalizeMedia("https://www.hudl.com/video/123")?.url).toBe("https://www.hudl.com/video/123");
    expect(normalizeMedia("https://example.com/reel.mp4?version=1")?.direct).toBe(true);
    expect(normalizeMedia("javascript:alert(1)")).toBeNull();
    expect(normalizeMedia("https://user:pass@example.com/reel")).toBeNull();
  });
  it("rejects unsafe and injected contact destinations", () => {
    expect(safeContactUrl("mailto:agent@example.com")).toBe(true); expect(safeContactUrl("tel:+1 (555) 555-0100")).toBe(true);
    expect(safeContactUrl("mailto:a@example.com?bcc=b@example.com")).toBe(false);
    expect(safeContactUrl("mailto:a%0d%0a@example.com")).toBe(false);
    expect(safeContactUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("non-destructive import dry runs", () => {
  it("reports collisions, missing assets, ambiguous measurements and unmapped values without mutation", () => {
    const source = { id: "source-1", username: "existing", displayName: "Approved name", template: "athlete", height: "6 foot ish", weight: "70 kg", gpa: "3.8", avatarUrl: "https://example.com/missing.jpg", isPublished: true, email: "private@example.com", extraField: "preserve", videoUrl: "https://example.com/reel.mp4", links: [{ url: "https://example.com/reel.mp4", label: "Highlights" }] };
    const original = structuredClone(source);
    const report = dryRunTalentImport(source, { slugs: ["existing"], assetUrls: [] });
    expect(source).toEqual(original); expect(report.collision).toBe(true); expect(report.missingAssets).toContain(source.avatarUrl);
    expect(report.warnings.some(w => w.includes("Ambiguous height"))).toBe(true); expect(report.unmapped.extraField).toBe("preserve");
    expect(report.proposed.talent.published).toBeNull(); expect(report.proposed.status).toBe("draft"); expect(report.destinationId).toBeNull();
    expect(report.proposed.talent.draft.facts.every(f => !f.visible)).toBe(true);
    expect(report.proposed.talent.draft.facts.find(f => f.key === "weight")?.value).toEqual({ type: "number", value: 70, unit: "kg" });
    expect(report.proposed.talent.draft.contacts).toEqual([]); expect(report.proposed.talent.draft.links[0].label.en).toBe("Highlights");
  });
});

describe("demo samples", () => {
  it.each(samplePresets)("%s shows a primary contact button, stat tiles, and a reel", preset => {
    const p = projectTalent(talentFixture(preset));
    expect(p.contacts.find(c => c.id === p.primaryContactId)).toBeTruthy();
    expect(p.facts.length).toBeGreaterThanOrEqual(3);
    expect(p.featuredReelId).toBe("sample-video");
    expect(p.sample).toBe(true);
  });
  it("uses operator photo and reel when provided, placeholders otherwise", () => {
    const custom = talentFixture("athlete", { portrait: "https://cdn.example/athlete.jpg", reel: { url: "https://cdn.example/reel.mp4" } });
    expect(custom.portrait).toBe("https://cdn.example/athlete.jpg");
    expect(custom.media[0]).toMatchObject({ url: "https://cdn.example/reel.mp4", poster: "https://cdn.example/athlete.jpg" });
    expect(talentFixture("athlete").portrait).toBe("");
  });
});

describe("SnapTrack brand", () => {
  it("brands athlete and cheer profiles SnapTrack, and nothing else", async () => {
    const { talentBrand } = await import("@/lib/talent/model");
    expect(talentBrand("athlete")).toBe("SnapTrack"); expect(talentBrand("cheer")).toBe("SnapTrack");
    expect(talentBrand("actor")).toBeNull(); expect(talentBrand("dancer")).toBeNull(); expect(talentBrand("creator")).toBeNull();
  });
});

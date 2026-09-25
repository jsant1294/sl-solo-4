import { describe, expect, it, vi } from "vitest";
vi.mock("@/db", () => ({ db: null }));
import { isSampleKey, loadSamples, sampleKeys, sampleStartHref, sampleStory } from "@/lib/samples";
import { proSampleKeys, proSampleProfile } from "@/lib/pro-samples";
import { publicContactActions } from "@/lib/contact-channels";

describe("storefront samples", () => {
  it("covers talent and professional audiences, each with a story in both languages", async () => {
    const loaded = await loadSamples("en");
    expect(loaded.map((s) => s.key)).toEqual([...sampleKeys]);
    for (const key of sampleKeys) { expect(sampleStory(key, "en").length).toBeGreaterThan(20); expect(sampleStory(key, "es")).not.toBe(sampleStory(key, "en")); }
    expect(loaded.filter((s) => s.kind === "pro").map((s) => s.key).sort()).toEqual([...proSampleKeys].sort());
  });
  it("routes professionals to Resume and talent to Talent Studio", () => {
    expect(sampleStartHref("nurse")).toBe("/get-started?path=professional");
    expect(sampleStartHref("combined")).toBe("/get-started?path=creator");
    expect(isSampleKey("athlete")).toBe(true); expect(isSampleKey("../etc")).toBe(false);
  });
  it.each(proSampleKeys)("%s is a fictional, safe profile with working contact actions", (key) => {
    const p = proSampleProfile(key, "es", "https://cdn.example/p.jpg");
    expect(p.avatarUrl).toBe("https://cdn.example/p.jpg"); expect(p.locale).toBe("es");
    const actions = publicContactActions(p, p.contactChannels, "", "es").filter((a) => a.href);
    expect(actions.length).toBeGreaterThanOrEqual(2);
    for (const a of actions) expect(a.href).toMatch(/^(tel:|sms:|mailto:|https:\/\/wa\.me\/)/);
    expect(JSON.stringify(p)).not.toMatch(/https?:\/\/(?!example\.com|cdn\.example|wa\.me)/);
    expect(p.bio).toMatch(/ficticio|fictional/);
  });
});

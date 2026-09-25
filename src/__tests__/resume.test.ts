import { afterEach, describe, expect, it, vi } from "vitest";
import { resumeExtraction, ResumeExtractionUnavailableError } from "@/lib/providers";
import { hasEntitlement, meetsEntitlementRequirement, ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";
import { repo } from "@/db/repo";

/**
 * Same test-architecture limitation as src/__tests__/networking.test.ts: this suite never
 * imports src/app/app/resume/actions.ts (or anything under src/lib/auth) because that
 * transitively pulls in next-auth, which fails to resolve "next/server" under plain-Node
 * vitest in this repo. Pre-existing, not introduced here. Access-control logic is exercised
 * at the layer the actions actually delegate to: meetsEntitlementRequirement(), hasEntitlement(),
 * and the repo itself. Live route verification supplements this where automated tests can't reach.
 */

const originalKey = process.env.ANTHROPIC_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalProvider = process.env.AI_EXTRACTION_PROVIDER;
afterEach(() => {
  vi.unstubAllGlobals();
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = originalKey;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = originalGroqKey;
  if (originalProvider === undefined) delete process.env.AI_EXTRACTION_PROVIDER; else process.env.AI_EXTRACTION_PROVIDER = originalProvider;
});

const fullExtraction = {
  name: "Ricardo Santiago", headline: "Event Chef · Catering Chef", summary: "15+ years of high-volume catering experience.",
  email: null, phone: null, location: "Atlanta, GA", website: null,
  experience: [
    { company: "State Farm Arena", title: "Event Chef", location: null, startDate: "2021", endDate: null, current: true, description: null },
    { company: "Dennis Dean Catering", title: "Catering Chef", location: null, startDate: "2016", endDate: "2021", current: false, description: null },
  ],
  education: [], skills: [{ name: "High-volume production" }, { name: "Sushi" }], certifications: [], languages: [], projects: [],
};

describe("resume extraction provider (mocked — never calls the real Anthropic API in tests)", () => {
  it("stops at the provider boundary when ANTHROPIC_API_KEY is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" }))
      .rejects.toBeInstanceOf(ResumeExtractionUnavailableError);
  });

  it("parses a full, well-formed JSON resume — including a non-corporate/trades use case", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(fullExtraction) }] }) })));
    const result = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" });
    expect(result.extraction.name).toBe("Ricardo Santiago");
    expect(result.extraction.headline).toBe("Event Chef · Catering Chef");
    expect(result.extraction.experience).toHaveLength(2);
    expect(result.extraction.experience[0].company).toBe("State Farm Arena");
    expect(result.extraction.experience[0].current).toBe(true);
    expect(result.extraction.skills.map((s) => s.name)).toEqual(["High-volume production", "Sushi"]);
  });

  it("tolerates a JSON response wrapped in markdown fences", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    const fenced = "```json\n" + JSON.stringify(fullExtraction) + "\n```";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: fenced }] }) })));
    const result = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" });
    expect(result.extraction.name).toBe("Ricardo Santiago");
  });

  it("handles a partial resume — missing sections normalize to empty arrays, not errors", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    const partial = { name: "Jo Lee", headline: null, summary: null, email: null, phone: null, location: null, website: null };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(partial) }] }) })));
    const result = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" });
    expect(result.extraction.name).toBe("Jo Lee");
    expect(result.extraction.experience).toEqual([]);
    expect(result.extraction.education).toEqual([]);
    expect(result.extraction.skills).toEqual([]);
  });

  it("throws a friendly error when the provider response has no parseable JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "Sorry, I can't read this." }] }) })));
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" })).rejects.toThrow();
  });

  it("surfaces a provider-error status without crashing", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" })).rejects.toThrow();
  });
});

describe("resume extraction — Groq backend (mocked, OpenAI-compatible chat-completions shape)", () => {
  it("stops at the provider boundary when AI_EXTRACTION_PROVIDER=groq but GROQ_API_KEY is missing", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    delete process.env.GROQ_API_KEY;
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "image/jpeg" }))
      .rejects.toBeInstanceOf(ResumeExtractionUnavailableError);
  });

  it("maps a Groq chat-completion response into the same StructuredResumeExtraction shape as Anthropic", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("api.groq.com");
      return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(fullExtraction) } }] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    // Groq's backend is image-only — a photographed resume page, not a PDF document block.
    const result = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "image/jpeg" });
    expect(result.provider).toBe("groq");
    expect(result.extraction.name).toBe("Ricardo Santiago");
    expect(result.extraction.experience).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a PDF under the Groq provider with a controlled error, not a crash or silent fallback to another vendor", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" })).rejects.toThrow(/PDF/);
    expect(fetchMock).not.toHaveBeenCalled(); // fails fast — never sends the document anywhere
  });

  it("fails cleanly on a malformed Groq response", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "nope" } }] }) })));
    await expect(resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "image/jpeg" })).rejects.toThrow();
  });

  it("provider switching doesn't change the shape the caller receives", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(fullExtraction) }] }) })));
    const viaAnthropic = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "application/pdf" });

    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(fullExtraction) } }] }) })));
    const viaGroq = await resumeExtraction.extractResume({ data: new Uint8Array([1]), contentType: "image/jpeg" });

    expect(viaAnthropic.extraction).toEqual(viaGroq.extraction);
    expect(viaAnthropic.provider).toBe("anthropic");
    expect(viaGroq.provider).toBe("groq");
  });
});

describe("meetsEntitlementRequirement — the configurable, non-hardcoded gate Resume uses", () => {
  it("NULL/free requirement always passes, regardless of what the user holds", () => {
    expect(meetsEntitlementRequirement(null, false)).toBe(true);
    expect(meetsEntitlementRequirement(undefined, false)).toBe(true);
    expect(meetsEntitlementRequirement(null, true)).toBe(true);
  });
  it("a configured key requires the grant", () => {
    expect(meetsEntitlementRequirement("solo_networking", false)).toBe(false);
    expect(meetsEntitlementRequirement("solo_networking", true)).toBe(true);
  });
});

describe("entitlement gating — no DB in this test env, the safe default", () => {
  it("a user with no entitlement (or no DB) has no networking/resume access", async () => {
    expect(await hasEntitlement("any-user", ENTITLEMENT_SOLO_NETWORKING)).toBe(false);
    expect(await hasEntitlement("any-user", "solo_resume")).toBe(false);
  });
});

describe("repo.resume requires a database (owner-scoped data has no demo fallback, matching Phase 1/2 precedent)", () => {
  it("every resume query throws cleanly without DATABASE_URL, rather than silently no-opping", async () => {
    await expect(repo.resume.getOwned("p1", "u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resume.getOwnedById("r1", "u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resume.getPublic("p1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resume.getOrCreateForProfile("p1", "u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resume.update("r1", "u1", { headline: "x" })).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resumeSettings.get()).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.resumeSettings.update({ featureEnabled: false })).rejects.toThrow(/DATABASE_URL/);
  });

  it("every section table (experience/education/skills/certifications/languages/projects) fails closed without DB", async () => {
    const sections = ["experience", "education", "skills", "certifications", "languages", "projects"] as const;
    for (const section of sections) {
      await expect(repo.resume[section].list("r1")).rejects.toThrow(/DATABASE_URL/);
      await expect(repo.resume[section].create("r1", "u1", {} as never)).rejects.toThrow(/DATABASE_URL/);
      await expect(repo.resume[section].update("i1", "r1", "u1", {} as never)).rejects.toThrow(/DATABASE_URL/);
      await expect(repo.resume[section].delete("i1", "r1", "u1")).rejects.toThrow(/DATABASE_URL/);
    }
  });
});

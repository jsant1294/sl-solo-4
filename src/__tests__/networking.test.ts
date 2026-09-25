import { afterEach, describe, expect, it, vi } from "vitest";
import { ocr, OCRProviderUnavailableError } from "@/lib/providers";
import { hasEntitlement, ENTITLEMENT_SOLO_NETWORKING } from "@/lib/entitlements";
import { repo } from "@/db/repo";

/**
 * Note: this suite deliberately never imports src/app/app/networking/actions.ts (or anything
 * under src/lib/auth) — that transitively pulls in next-auth, which fails to resolve
 * "next/server" under plain-Node vitest in this repo (a pre-existing limitation affecting
 * every server action file equally, not something introduced here — no other test in this
 * suite imports an app/*\/actions.ts file either). Access-control behavior is exercised at
 * the layer the actions actually delegate to: hasEntitlement() and the repo itself.
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

describe("OCR provider (mocked — never calls the real Anthropic API in tests)", () => {
  it("stops at the provider boundary when ANTHROPIC_API_KEY is not configured", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" }))
      .rejects.toBeInstanceOf(OCRProviderUnavailableError);
  });

  it("parses a well-formed JSON candidate from the mocked provider response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    const candidateJson = JSON.stringify({
      firstName: "Alex", lastName: "Brown", fullName: "Alex Brown", jobTitle: "Creative Director",
      company: "Brightleaf Studio", email: "alex@brightleafstudio.co.uk", phone: "+44 23 2346 1245",
      mobilePhone: null, website: "brightleafstudio.co.uk", addressLine: null, city: null, region: null,
      postalCode: null, country: null, linkedinUrl: null, otherUrls: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true, json: async () => ({ content: [{ type: "text", text: candidateJson }] }),
    })));
    const result = await ocr.extractBusinessCard({ data: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
    expect(result.candidate.firstName).toBe("Alex");
    expect(result.candidate.company).toBe("Brightleaf Studio");
    expect(result.candidate.email).toBe("alex@brightleafstudio.co.uk");
    expect(result.rawText).toContain("Brightleaf");
  });

  it("tolerates a JSON response wrapped in markdown fences", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    const fenced = "```json\n" + JSON.stringify({ firstName: "Jo", lastName: null, fullName: "Jo Lee", jobTitle: null, company: null, email: null, phone: null, mobilePhone: null, website: null, addressLine: null, city: null, region: null, postalCode: null, country: null, linkedinUrl: null, otherUrls: [] }) + "\n```";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: fenced }] }) })));
    const result = await ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/png" });
    expect(result.candidate.firstName).toBe("Jo");
  });

  it("throws a friendly error when the provider response has no parseable JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "I couldn't read this card." }] }) })));
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" })).rejects.toThrow();
  });

  it("surfaces a provider-error status without crashing", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" })).rejects.toThrow();
  });
});

describe("OCR provider — Groq backend (mocked, OpenAI-compatible chat-completions shape)", () => {
  it("stops at the provider boundary when AI_EXTRACTION_PROVIDER=groq but GROQ_API_KEY is missing", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    delete process.env.GROQ_API_KEY;
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" }))
      .rejects.toBeInstanceOf(OCRProviderUnavailableError);
  });

  it("maps a Groq chat-completion response into the same BusinessCardCandidate shape as Anthropic", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    const candidateJson = JSON.stringify({
      firstName: "Alex", lastName: "Brown", fullName: "Alex Brown", jobTitle: "Creative Director",
      company: "Brightleaf Studio", email: "alex@brightleafstudio.co.uk", phone: "+44 23 2346 1245",
      mobilePhone: null, website: "brightleafstudio.co.uk", addressLine: null, city: null, region: null,
      postalCode: null, country: null, linkedinUrl: null, otherUrls: [],
    });
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("api.groq.com");
      return { ok: true, json: async () => ({ choices: [{ message: { content: candidateJson } }] }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await ocr.extractBusinessCard({ data: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
    expect(result.candidate.firstName).toBe("Alex");
    expect(result.candidate.company).toBe("Brightleaf Studio");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails cleanly on a malformed Groq response instead of returning garbage", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: "not json at all" } }] }) })));
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" })).rejects.toThrow();
  });

  it("surfaces a Groq provider-error status without crashing", async () => {
    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    await expect(ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" })).rejects.toThrow();
  });

  it("provider switching doesn't change what the caller receives — same candidate shape from either provider", async () => {
    const candidateJson = JSON.stringify({ firstName: "Sam", lastName: null, fullName: "Sam", jobTitle: null, company: null, email: null, phone: null, mobilePhone: null, website: null, addressLine: null, city: null, region: null, postalCode: null, country: null, linkedinUrl: null, otherUrls: [] });

    process.env.AI_EXTRACTION_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "test-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: candidateJson }] }) })));
    const viaAnthropic = await ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" });

    process.env.AI_EXTRACTION_PROVIDER = "groq";
    process.env.GROQ_API_KEY = "test-groq-key-not-real";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: candidateJson } }] }) })));
    const viaGroq = await ocr.extractBusinessCard({ data: new Uint8Array([1]), contentType: "image/jpeg" });

    expect(viaAnthropic.candidate).toEqual(viaGroq.candidate);
  });
});

describe("entitlement gating — the mechanism every Networking route/action relies on", () => {
  it("a user with no entitlement (or no DB) has no networking access", async () => {
    expect(await hasEntitlement("any-user", ENTITLEMENT_SOLO_NETWORKING)).toBe(false);
  });
  it("a missing userId never has access", async () => {
    expect(await hasEntitlement(null, ENTITLEMENT_SOLO_NETWORKING)).toBe(false);
    expect(await hasEntitlement(undefined, ENTITLEMENT_SOLO_NETWORKING)).toBe(false);
  });
});

describe("repo.networkingLeads / repo.networkingSettings require a database (owner-scoped data has no demo fallback, matching the bundle-commerce precedent)", () => {
  it("every networkingLeads query throws cleanly without DATABASE_URL, rather than silently no-opping", async () => {
    await expect(repo.networkingLeads.listByUser("u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingLeads.byId("l1", "u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingLeads.create("u1", { displayName: "Test", source: "manual" } as never)).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingLeads.update("l1", "u1", { notes: "x" })).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingLeads.delete("l1", "u1")).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingLeads.findDuplicate("u1", { email: "a@b.com" })).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingSettings.get()).rejects.toThrow(/DATABASE_URL/);
    await expect(repo.networkingSettings.update({ networkingEnabled: false })).rejects.toThrow(/DATABASE_URL/);
  });
});

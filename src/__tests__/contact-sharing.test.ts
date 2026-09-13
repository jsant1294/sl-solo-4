import { describe, expect, it } from "vitest";
import { normalizePhone, normalizeContactHref, publicContactActions, resolvePrimaryAction } from "@/lib/contact-channels";
import { buildPublicVcard } from "@/lib/vcard";
import { buildShareModel } from "@/lib/profile-sharing";
import { DEMO_PROFILES } from "@/db/demo";
import { getProfileExperience, withProfileExperience, type StoredContactChannel, type StoredPaymentMethod } from "@/lib/profile-data";
import { normalizePaymentMethod, publicPaymentMethods } from "@/lib/payment-methods";

const profile = DEMO_PROFILES[0];
const row = (type: string, value: string | null = null, enabled = true, visible = true, sortOrder = 0): StoredContactChannel => ({ id: `c-${type}`, profileId: profile.id, type, value, enabled, public: visible, sortOrder, createdAt: new Date(), updatedAt: new Date() });

describe("contact normalization", () => {
  it("normalizes phone, call, SMS and WhatsApp", () => {
    expect(normalizePhone("+1 (404) 555-0142")).toBe("+14045550142");
    expect(normalizeContactHref("call", "+1 (404) 555-0142")).toBe("tel:+14045550142");
    expect(normalizeContactHref("sms", "+1 (404) 555-0142")).toBe("sms:+14045550142");
    expect(normalizeContactHref("whatsapp", "+1 (404) 555-0142")).toBe("https://wa.me/14045550142");
  });
  it("generates service links", () => {
    expect(normalizeContactHref("email", "HELLO@Example.com")).toBe("mailto:hello@example.com");
    expect(normalizeContactHref("messenger", "snap.link")).toBe("https://m.me/snap.link");
    expect(normalizeContactHref("telegram", "@snaplink")).toBe("https://t.me/snaplink");
    expect(normalizeContactHref("viber", "snaplinkbot")).toBe("viber://pa?chatURI=snaplinkbot");
    expect(normalizeContactHref("line", "snaplink")).toBe("https://line.me/R/ti/p/snaplink");
    expect(normalizeContactHref("snapchat", "snaplink")).toBe("https://www.snapchat.com/add/snaplink");
  });
  it("rejects unsafe and invalid custom URLs", () => {
    expect(normalizeContactHref("custom", "javascript:alert(1)")).toBeNull();
    expect(normalizeContactHref("custom", "data:text/html,bad")).toBeNull();
    expect(normalizeContactHref("custom", "file:///tmp/a")).toBeNull();
    expect(normalizeContactHref("custom", "https://example.com/contact")).toBe("https://example.com/contact");
  });
});

describe("public channel policy", () => {
  it("only renders enabled and public rows and selects a valid primary", () => {
    const p = { ...profile, data: { experience: { primaryContactAction: "whatsapp" } } };
    const actions = publicContactActions(p, [row("call"), row("whatsapp", "+14045550142"), row("telegram", "hidden", false, true), row("email", null, true, false)]);
    expect(actions.map((x) => x.type)).toEqual(["call", "whatsapp", "share"]);
    expect(resolvePrimaryAction(p, actions).type).toBe("whatsapp");
  });
  it("does not expose unsupported Kids channels or private guardian data", () => {
    const kids = DEMO_PROFILES[2];
    const actions = publicContactActions(kids, [row("call"), row("email"), row("telegram", "private")]);
    expect(actions.map((x) => x.type)).toEqual(["call", "share"]);
    expect(actions[0]).toMatchObject({ type: "call", href: null, guardian: true });
    expect(JSON.stringify(actions)).not.toContain("14045550101");
  });
});

describe("VCF", () => {
  it("generates a real Unicode-safe VCF and omits hidden fields", () => {
    const unicode = { ...profile, displayName: "José Santiago", email: "private@example.com" };
    const card = buildPublicVcard(unicode, [row("call"), row("vcard")], "https://snaplink.test/u/jose");
    expect(card).toContain("BEGIN:VCARD\r\nVERSION:3.0");
    expect(card).toContain("FN:José Santiago");
    expect(card).toContain("TEL;TYPE=CELL:+14045550142");
    expect(card).not.toContain("private@example.com");
    expect(card).toContain("URL;TYPE=PROFILE:https://snaplink.test/u/jose");
  });
  it("handles missing optional fields", () => {
    const card = buildPublicVcard({ ...profile, phone: null, email: null, website: null, headline: null, location: null }, [row("vcard")], "https://snaplink.test/u/jose");
    expect(card).toContain("END:VCARD"); expect(card).not.toContain("TEL;"); expect(card).not.toContain("EMAIL;");
  });
  it("is Kids-safe: uses the guardian's identity and phone, never the child's real name or other private fields", () => {
    const kids = DEMO_PROFILES[2];
    const card = buildPublicVcard(kids, [row("call"), row("vcard")], "https://snaplink.test/u/k7f3q9xz");
    expect(card).toContain("FN:Ana — SnapLink Protect");
    expect(card).toContain("TEL;TYPE=CELL:+14045550101"); // Ana, priority 1 — not Jose (priority 2)
    expect(card).not.toContain("Sofia");
    expect(card).not.toContain("Peanuts");
    expect(card).not.toContain("EMAIL;"); expect(card).not.toContain("TITLE:"); expect(card).not.toContain("ADR;");
  });
});

describe("profile sharing", () => {
  it("uses profile defaults, canonical URL, theme and image fallback", () => {
    const model = buildShareModel(profile, "https://solo.example");
    expect(model.title).toBe(profile.displayName); expect(model.description).toBe(profile.headline);
    expect(model.canonicalUrl).toBe("https://solo.example/u/jose"); expect(model.imageUrl).toBe("https://solo.example/u/jose/opengraph-image?v=no-avatar");
    expect(model.initials).toBe("JS"); expect(model.theme).toBe("obsidian");
  });
  it("changes the generated OG URL when the avatar changes so message apps refresh their cache", () => {
    const first = buildShareModel({ ...profile, avatarUrl: "https://blob.example/avatars/jose-one.png" }, "https://solo.example");
    const second = buildShareModel({ ...profile, avatarUrl: "https://blob.example/avatars/jose-two.png" }, "https://solo.example");
    expect(first.imageUrl).toBe("https://solo.example/u/jose/opengraph-image?v=jose-one.png");
    expect(second.imageUrl).toBe("https://solo.example/u/jose/opengraph-image?v=jose-two.png");
    expect(second.imageUrl).not.toBe(first.imageUrl);
  });
  it("honors safe overrides without mixing VCF data", () => {
    const model = buildShareModel({ ...profile, data: { experience: { shareTitle: "Custom title", shareDescription: "Custom description", shareImageUrl: "https://blob.example/share.jpg" } } }, "https://solo.example");
    expect(model.title).toBe("Custom title"); expect(model.description).toBe("Custom description"); expect(model.imageUrl).toBe("https://blob.example/share.jpg");
    expect(model).not.toHaveProperty("phone"); expect(model).not.toHaveProperty("email");
  });
  it("enforces Kids-safe metadata", () => {
    const kids = buildShareModel(DEMO_PROFILES[2], "https://solo.example");
    expect(kids.kidsSafe).toBe(true); expect(kids.title).toBe("SnapLink Protect");
    expect(JSON.stringify(kids)).not.toContain("Peanuts"); expect(JSON.stringify(kids)).not.toContain("1404555");
  });
});

describe("mobile compaction settings", () => {
  it("persists at most two ordered favorite links in the existing experience payload", () => {
    const data = withProfileExperience({}, { favoriteLinkIds: ["link-a", "link-b"] });
    expect(getProfileExperience(data).favoriteLinkIds).toEqual(["link-a", "link-b"]);
  });
  it("normalizes configured payment destinations", () => {
    const method = (type: StoredPaymentMethod["type"], value: string): StoredPaymentMethod => ({ type, value, enabled: true, public: true, sortOrder: 0 });
    expect(normalizePaymentMethod(method("venmo", "@snaplink"))?.href).toBe("https://venmo.com/u/snaplink");
    expect(normalizePaymentMethod(method("cashapp", "$snaplink"))?.href).toBe("https://cash.app/$snaplink");
    expect(normalizePaymentMethod(method("paypal", "snaplink"))?.href).toBe("https://paypal.me/snaplink");
    expect(normalizePaymentMethod(method("zelle", "pay@example.com"))).toMatchObject({ href: null, copyValue: "pay@example.com" });
    expect(normalizePaymentMethod(method("custom", "javascript:alert(1)"))).toBeNull();
  });
  it("hides disabled and private payment methods", () => {
    const methods: StoredPaymentMethod[] = [
      { type: "paypal", value: "public", enabled: true, public: true, sortOrder: 0 },
      { type: "venmo", value: "disabled", enabled: false, public: true, sortOrder: 1 },
      { type: "cashapp", value: "private", enabled: true, public: false, sortOrder: 2 },
    ];
    expect(publicPaymentMethods(methods).map((method) => method.type)).toEqual(["paypal"]);
  });
});

import { describe, it, expect } from "vitest";
import { dict, LOCALES } from "@/i18n/dict";

/**
 * Regression tests for mixed-language bugs (e.g. an ES page rendering
 * "Buy / We ship / Tap…" instead of "Compra / Te lo enviamos / Toca…").
 * These guard the single source of truth (dict.ts) rather than rendered
 * DOM, so they stay cheap and framework-agnostic.
 */

function keyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length ? [keyShape(value[0])] : [];
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as object).sort().map((k) => [k, keyShape((value as Record<string, unknown>)[k])]));
  }
  return typeof value;
}

// Exact English phrases that have previously leaked into the ES dictionary.
// Only multi-word, unambiguous phrases — never single loanwords like
// "Hardware", "NFC", or brand names, which are intentionally identical
// across locales.
const knownEnglishLeaks = [
  "We ship",
  "Choose your hardware and checkout securely.",
  "We prepare and send your SnapLink.",
  "Hold a phone near your SnapLink.",
  "Connect it to your SOLO profile.",
  "Change what opens anytime.",
  "Shop SnapLink",
  "See it work",
  "Choose this SnapLink",
  "No app required",
  "Secure checkout",
  "Update anytime",
];

describe("i18n dictionary", () => {
  it("defines both locales", () => {
    expect(LOCALES).toEqual(["en", "es"]);
    expect(dict.en).toBeTruthy();
    expect(dict.es).toBeTruthy();
  });

  it("EN and ES have identical key structure (catches a locale missing a whole section)", () => {
    expect(keyShape(dict.es)).toEqual(keyShape(dict.en));
  });

  it("ES dictionary contains none of the known English UI leaks", () => {
    const esBlob = JSON.stringify(dict.es);
    for (const phrase of knownEnglishLeaks) {
      expect(esBlob.includes(phrase), `Found English fallback "${phrase}" inside the ES dictionary`).toBe(false);
    }
  });

  it("the homepage 'how it works' steps are translated in ES", () => {
    const en = dict.en.home.processSteps.map((s) => s.t);
    const es = dict.es.home.processSteps.map((s) => s.t);
    expect(es).toEqual(["Compra", "Te lo enviamos", "Toca", "Activa", "Actualiza"]);
    es.forEach((t, i) => expect(t).not.toBe(en[i]));
  });

  it("nav and common chrome strings differ between EN and ES", () => {
    const pairs: Array<[string, string]> = [
      [dict.en.nav.shop, dict.es.nav.shop],
      [dict.en.nav.explore, dict.es.nav.explore],
      [dict.en.common.openMenu, dict.es.common.openMenu],
      [dict.en.common.closeMenu, dict.es.common.closeMenu],
      [dict.en.common.language, dict.es.common.language],
    ];
    for (const [en, es] of pairs) expect(es).not.toBe(en);
  });

  it("contact-channel labels are translated in ES, except platform brand names", () => {
    const c = dict.es.contact;
    expect(c.call).toBe("Llamar");
    expect(c.sms).toBe("Mensaje");
    expect(c.email).toBe("Correo");
    expect(c.vcard).toBe("Guardar contacto");
    expect(c.share).toBe("Compartir perfil");
    // Platform names stay unchanged across locales.
    expect(c.whatsapp).toBe(dict.en.contact.whatsapp);
    expect(c.messenger).toBe(dict.en.contact.messenger);
    expect(c.line).toBe(dict.en.contact.line);
  });
});

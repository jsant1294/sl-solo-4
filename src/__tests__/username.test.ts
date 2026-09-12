import { describe, it, expect } from "vitest";
import { normalizeUsername, checkUsername, RESERVED } from "@/lib/username";

describe("username normalization", () => {
  it("lowercases and strips unsafe chars", () => {
    expect(normalizeUsername("José Santiago!")).toBe("jossantiago");
    expect(normalizeUsername("  Marcus_Builds  ")).toBe("marcus_builds");
  });
  it("collapses repeated separators and trims them", () => {
    expect(normalizeUsername("--a__b--")).toBe("a-b");
    expect(normalizeUsername("hi___there")).toBe("hi-there");
  });
});

describe("username validation", () => {
  it("accepts a clean handle", () => {
    expect(checkUsername("marcusbuilds")).toEqual({ ok: true, value: "marcusbuilds" });
  });
  it("rejects too short", () => {
    expect(checkUsername("ab")).toEqual({ ok: false, reason: "too_short" });
  });
  it("rejects reserved terms", () => {
    for (const r of ["admin", "api", "solo", "upgrade"]) {
      expect(checkUsername(r)).toEqual({ ok: false, reason: "reserved" });
    }
  });
  it("reserved set includes routing words", () => {
    expect(RESERVED.has("hardware")).toBe(true);
    expect(RESERVED.has("activate")).toBe(true);
  });
});

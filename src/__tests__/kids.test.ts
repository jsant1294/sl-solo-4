import { describe, it, expect } from "vitest";
import { kidsDataSchema, validateProfileData, asKidsData } from "@/lib/profile-data";

const validKids = {
  firstName: "Sofia",
  helpMessage: "If I need help, contact my guardian.",
  usePhoto: false,
  guardians: [
    { label: "Mom", name: "Ana", phone: "+14045550101", priority: 1 },
    { label: "Dad", name: "Jose", phone: "+14045550142", priority: 2 },
  ],
};

describe("kids validation", () => {
  it("accepts a valid kids payload", () => {
    expect(() => kidsDataSchema.parse(validKids)).not.toThrow();
  });

  it("requires at least one guardian", () => {
    expect(() => kidsDataSchema.parse({ ...validKids, guardians: [] })).toThrow();
  });

  it("requires a priority-1 guardian", () => {
    const noPrimary = { ...validKids, guardians: [{ label: "Aunt", name: "Rosa", phone: "+14045550155", priority: 2 }] };
    expect(() => kidsDataSchema.parse(noPrimary)).toThrow(/priority 1/i);
  });

  it("defaults photo off (privacy default)", () => {
    const parsed = kidsDataSchema.parse({ ...validKids, usePhoto: undefined });
    expect(parsed.usePhoto).toBe(false);
  });

  it("caps first name length to discourage full names", () => {
    const longName = { ...validKids, firstName: "x".repeat(40) };
    expect(() => kidsDataSchema.parse(longName)).toThrow();
  });

  it("emergency is optional and defaults disabled when present", () => {
    const parsed = kidsDataSchema.parse({ ...validKids, emergency: { allergies: "Peanuts" } });
    expect(parsed.emergency?.enabled).toBe(false);
  });
});

describe("validateProfileData dispatch", () => {
  it("routes kids through kids schema", () => {
    expect(() => validateProfileData("kids", validKids)).not.toThrow();
    expect(() => validateProfileData("kids", { firstName: "" })).toThrow();
  });
  it("personal accepts empty object", () => {
    expect(validateProfileData("personal", {})).toEqual({});
  });
  it("business accepts optional category", () => {
    expect(validateProfileData("business", { category: "Photography" })).toEqual({ category: "Photography" });
  });
});

describe("asKidsData guard", () => {
  it("returns null on invalid data (never renders bad kids page)", () => {
    expect(asKidsData({ nope: true })).toBeNull();
  });
  it("returns parsed data on valid", () => {
    expect(asKidsData(validKids)?.firstName).toBe("Sofia");
  });
});

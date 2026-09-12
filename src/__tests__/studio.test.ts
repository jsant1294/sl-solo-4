import { describe, it, expect } from "vitest";
import { getProfileByDestination, getOwnedProfile, getOwnedProfiles, OWNER_USER_ID } from "@/db/demo";
import { checkUsername } from "@/lib/username";

describe("ownership scoping (pure)", () => {
  it("getOwnedProfile returns a profile only for its owner", () => {
    expect(getOwnedProfile("demo_personal", OWNER_USER_ID)?.userId).toBe(OWNER_USER_ID);
    expect(getOwnedProfile("demo_personal", "someone_else")).toBeUndefined();
  });
  it("unknown profile id is never owned", () => {
    expect(getOwnedProfile("does_not_exist", OWNER_USER_ID)).toBeUndefined();
  });
  it("kids profile scopes by user like any other", () => {
    expect(getOwnedProfile("demo_kids", OWNER_USER_ID)).toBeTruthy();
    expect(getOwnedProfile("demo_kids", "someone_else")).toBeUndefined();
  });
  it("listing returns only the caller's profiles", () => {
    const mine = getOwnedProfiles(OWNER_USER_ID);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((p) => p.userId === OWNER_USER_ID)).toBe(true);
    expect(getOwnedProfiles("nobody").length).toBe(0);
  });
});

describe("destination resolution (stable NFC/QR routing)", () => {
  it("resolves a token to its profile", () => {
    expect(getProfileByDestination("dst_jose01")?.id).toBe("demo_personal");
    expect(getProfileByDestination("dst_sofia9")?.type).toBe("kids");
  });
  it("returns undefined for unknown tokens", () => {
    expect(getProfileByDestination("nope")).toBeUndefined();
  });
});

describe("username claim rules", () => {
  it("rejects reserved names", () => { expect(checkUsername("admin").ok).toBe(false); });
  it("accepts a clean handle", () => { expect(checkUsername("jose").ok).toBe(true); });
});

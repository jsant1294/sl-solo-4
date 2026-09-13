import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/operator", () => ({ requireOperator: vi.fn() }));
vi.mock("@/db/repo", () => ({
  repo: { profiles: { byUsername: vi.fn(), createForOwner: vi.fn() } },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`); }),
}));

import { createOperatorProfile } from "@/app/operator/profiles/actions";
import { repo } from "@/db/repo";
import { requireOperator } from "@/lib/operator";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const validFields = {
  ownerEmail: "owner@example.com", ownerName: "Jane Doe",
  displayName: "Jane's Studio", username: "jane-studio",
  type: "personal", locale: "en", accent: "",
};

async function redirectTarget(fd: FormData): Promise<string> {
  try {
    await createOperatorProfile(fd);
    throw new Error("expected a redirect");
  } catch (e) {
    return (e as Error).message.replace(/^REDIRECT:/, "");
  }
}

beforeEach(() => {
  vi.mocked(requireOperator).mockReset().mockResolvedValue("op-user-id");
  vi.mocked(repo.profiles.byUsername).mockReset();
  vi.mocked(repo.profiles.createForOwner).mockReset();
});

describe("operator profile creation — requireOperator gating", () => {
  it("calls requireOperator before any repo access", async () => {
    vi.mocked(requireOperator).mockRejectedValueOnce(new Error("not an operator"));
    await expect(createOperatorProfile(form(validFields))).rejects.toThrow("not an operator");
    expect(repo.profiles.byUsername).not.toHaveBeenCalled();
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });
});

describe("operator profile creation — validation", () => {
  it("rejects a missing required field (owner email)", async () => {
    const target = await redirectTarget(form({ ...validFields, ownerEmail: "" }));
    expect(target).toMatch(/^\/operator\/profiles\/new\?error=/);
    expect(repo.profiles.byUsername).not.toHaveBeenCalled();
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });

  it("rejects an invalid owner email format", async () => {
    const target = await redirectTarget(form({ ...validFields, ownerEmail: "not-an-email" }));
    expect(target).toMatch(/^\/operator\/profiles\/new\?error=/);
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });

  it("rejects a missing display name", async () => {
    const target = await redirectTarget(form({ ...validFields, displayName: "" }));
    expect(target).toMatch(/^\/operator\/profiles\/new\?error=/);
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });

  it("rejects an invalid username (too short)", async () => {
    const target = await redirectTarget(form({ ...validFields, username: "ab" }));
    expect(decodeURIComponent(target)).toContain("at least 3 characters");
    expect(repo.profiles.byUsername).not.toHaveBeenCalled();
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });

  it("rejects a reserved username", async () => {
    const target = await redirectTarget(form({ ...validFields, username: "admin" }));
    expect(decodeURIComponent(target)).toContain("reserved");
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });
});

describe("operator profile creation — duplicate handling", () => {
  it("rejects a username that is already in use, without leaking DB internals", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue({ id: "existing" } as never);
    const target = await redirectTarget(form(validFields));
    expect(decodeURIComponent(target)).toBe("/operator/profiles/new?error=This username is already in use.");
    expect(repo.profiles.createForOwner).not.toHaveBeenCalled();
  });

  it("does not treat an existing owner email as an error — createForOwner reuses it", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(undefined);
    vi.mocked(repo.profiles.createForOwner).mockResolvedValue({
      profile: { id: "profile_1" }, owner: { id: "owner_1", email: validFields.ownerEmail },
    } as never);
    const target = await redirectTarget(form(validFields));
    expect(target).toBe("/operator/profiles/profile_1");
  });
});

describe("operator profile creation — reuses the existing repo primitive", () => {
  it("calls repo.profiles.createForOwner with the expected shape instead of inserting directly", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(undefined);
    vi.mocked(repo.profiles.createForOwner).mockResolvedValue({
      profile: { id: "profile_2" }, owner: { id: "owner_2" },
    } as never);
    await redirectTarget(form(validFields));
    expect(repo.profiles.createForOwner).toHaveBeenCalledWith({
      ownerEmail: "owner@example.com", ownerName: "Jane Doe",
      type: "personal", username: "jane-studio", displayName: "Jane's Studio",
      locale: "en", data: {}, accent: null,
    });
  });

  it("falls back to a safe default type/locale for unrecognized input", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(undefined);
    vi.mocked(repo.profiles.createForOwner).mockResolvedValue({
      profile: { id: "profile_3" }, owner: { id: "owner_3" },
    } as never);
    await redirectTarget(form({ ...validFields, type: "pet", locale: "fr" }));
    expect(repo.profiles.createForOwner).toHaveBeenCalledWith(expect.objectContaining({ type: "personal", locale: "en" }));
  });

  it("never inserts into users/profiles directly from the action", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const source = fs.readFileSync(path.join(process.cwd(), "src/app/operator/profiles/actions.ts"), "utf8");
    expect(source).not.toMatch(/\b(db|tx)\.insert\(/);
    expect(source).toContain("repo.profiles.createForOwner(");
  });
});

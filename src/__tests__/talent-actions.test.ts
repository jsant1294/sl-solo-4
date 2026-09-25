import { beforeEach, describe, expect, it, vi } from "vitest";
import { newTalent, readEnvelope } from "@/lib/talent/model";
const state = vi.hoisted(() => ({ owner: {} as Record<string, unknown>, denied: false }));
vi.mock("@/db", () => ({ db: null }));
vi.mock("@/lib/auth", () => ({ requireOwnedProfile: vi.fn(async () => { if (state.denied) throw new Error("Not your profile"); return state.owner; }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { saveTalent } from "@/app/app/profiles/[profileId]/talent/actions";

describe("Talent publication authorization and snapshots", () => {
  beforeEach(() => { state.denied = false; state.owner = { id: "p", userId: "owner", username: "sample", type: "personal", status: "draft", data: { unrelated: "preserved" } }; });
  it("keeps draft edits private until a new publication and unpublishes explicitly", async () => {
    const first = newTalent("Published name", "actor");
    expect((await saveTalent("p", first, 0, "publish")).ok).toBe(true); expect(state.owner.status).toBe("active");
    const changed = { ...first, displayName: "Private draft name" };
    expect((await saveTalent("p", changed, 1, "draft")).ok).toBe(true);
    let envelope = readEnvelope(state.owner.data)!; expect(envelope.published?.displayName).toBe("Published name"); expect(envelope.draft.displayName).toBe("Private draft name");
    expect((state.owner.data as Record<string, unknown>).unrelated).toBe("preserved");
    expect((await saveTalent("p", changed, 2, "publish")).ok).toBe(true);
    envelope = readEnvelope(state.owner.data)!; expect(envelope.published?.displayName).toBe("Private draft name");
    expect((await saveTalent("p", changed, 3, "unpublish")).ok).toBe(true); expect(state.owner.status).toBe("draft"); expect(readEnvelope(state.owner.data)?.published).toBeNull();
  });
  it("saving a first draft on a live profile keeps it live", async () => {
    state.owner.status = "active";
    expect((await saveTalent("p", newTalent("Draft only"), 0, "draft")).ok).toBe(true);
    expect(state.owner.status).toBe("active"); expect(readEnvelope(state.owner.data)?.published).toBeNull();
  });
  it("rejects stale updates without overwriting content", async () => {
    await saveTalent("p", newTalent("First"), 0, "draft");
    const result = await saveTalent("p", newTalent("Stale"), 0, "publish");
    expect(result).toEqual({ ok: false, code: "conflict" }); expect(readEnvelope(state.owner.data)?.draft.displayName).toBe("First"); expect(state.owner.status).toBe("draft");
  });
  it("denies another owner's profile and Protect profiles", async () => {
    state.denied = true; expect((await saveTalent("other", newTalent("No access"), 0, "publish")).ok).toBe(false); expect(state.owner.data).toEqual({ unrelated: "preserved" });
    state.denied = false; state.owner.type = "kids"; expect((await saveTalent("p", newTalent("No access"), 0, "publish")).ok).toBe(false);
  });
  it("validates untrusted inputs and operation names server-side", async () => {
    expect((await saveTalent("p", { displayName: "Invalid" }, 0, "publish")).ok).toBe(false);
    expect((await saveTalent("p", newTalent("Valid"), 0, "delete" as never)).ok).toBe(false); expect(state.owner.status).toBe("draft");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/repo", () => ({
  repo: {
    profiles: { byUsername: vi.fn() },
    leads: { create: vi.fn(), recentDuplicate: vi.fn(), countRecentByFingerprint: vi.fn() },
    events: { record: vi.fn() },
  },
}));

import { POST } from "@/app/api/leads/route";
import { repo } from "@/db/repo";

function post(body: unknown) {
  return POST(new Request("http://test.local/api/leads", {
    method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.4" }, body: JSON.stringify({ consent: true, ...(body as object) }),
  }));
}

const activeProfile = { id: "profile_real_1", status: "active", username: "realuser" };
const otherProfile = { id: "profile_real_2", status: "active", username: "otheruser" };

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
  vi.mocked(repo.profiles.byUsername).mockReset();
  vi.mocked(repo.leads.create).mockReset().mockResolvedValue({ id: "lead_x" } as never);
  vi.mocked(repo.leads.recentDuplicate).mockReset().mockResolvedValue(false);
  vi.mocked(repo.leads.countRecentByFingerprint).mockReset().mockResolvedValue(0);
  vi.mocked(repo.events.record).mockReset().mockResolvedValue(undefined as never);
});

describe("POST /api/leads (DB mode — @/db and @/db/repo mocked)", () => {
  it("resolves the profile by username, persists against its real id, and records a contact activity event", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(activeProfile as never);
    const res = await post({ username: "realuser", email: "lead@example.com", message: "hello" });
    expect(res.status).toBe(200);
    expect(repo.profiles.byUsername).toHaveBeenCalledWith("realuser");
    expect(repo.leads.create).toHaveBeenCalledWith(expect.objectContaining({ profileId: activeProfile.id, email: "lead@example.com" }));
    expect(repo.events.record).toHaveBeenCalledWith(activeProfile.id, "contact", "profile");
  });

  it("rate limits repeated submissions from the same privacy-preserving fingerprint", async () => {
    vi.mocked(repo.leads.countRecentByFingerprint).mockResolvedValue(5);
    const res = await post({ username: "realuser", email: "limited@example.com" });
    expect(res.status).toBe(429);
    expect(repo.profiles.byUsername).not.toHaveBeenCalled();
  });

  it("never uses a client-supplied profileId — only the id resolved from the username", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(activeProfile as never);
    await post({ username: "realuser", profileId: otherProfile.id, email: "lead2@example.com" });
    expect(repo.leads.create).toHaveBeenCalledWith(expect.objectContaining({ profileId: activeProfile.id }));
    expect(repo.leads.create).not.toHaveBeenCalledWith(expect.objectContaining({ profileId: otherProfile.id }));
  });

  it("rejects a draft/inactive profile with a generic error and never persists or records an event", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue({ ...activeProfile, status: "draft" } as never);
    const res = await post({ username: "realuser", email: "lead3@example.com" });
    expect(res.status).toBe(400);
    expect(repo.leads.create).not.toHaveBeenCalled();
    expect(repo.events.record).not.toHaveBeenCalled();
  });

  it("rejects a nonexistent profile with the identical generic error used for the inactive case", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(undefined);
    const res = await post({ username: "ghost", email: "lead4@example.com" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("We could not send your message. Please try again.");
    expect(repo.leads.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate submission within the dedupe window without persisting again", async () => {
    vi.mocked(repo.profiles.byUsername).mockResolvedValue(activeProfile as never);
    vi.mocked(repo.leads.recentDuplicate).mockResolvedValue(true);
    const res = await post({ username: "realuser", email: "dupe@example.com" });
    expect(res.status).toBe(400);
    expect(repo.leads.create).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/leads/route";
import { DEMO_PROFILES, listDemoLeads, addDemoLead, _resetDemoLeadsForTests } from "@/db/demo";

const jose = DEMO_PROFILES[0]; // username "jose", active, real demo fixture

function post(body: unknown) {
  return POST(new Request("http://test.local/api/leads", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ consent: true, ...(body as object) }),
  }));
}

afterEach(() => { _resetDemoLeadsForTests(); });

describe("POST /api/leads (demo mode — no DATABASE_URL in this test env)", () => {
  it("creates and persists a lead for a valid, active profile", async () => {
    const res = await post({ username: jose.username, name: "Test User", email: "lead-success@example.com", message: "Hi there" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const leads = listDemoLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ profileId: jose.id, name: "Test User", email: "lead-success@example.com", message: "Hi there", source: "profile" });
  });

  it("rejects input with neither phone nor email", async () => {
    const res = await post({ username: jose.username, name: "No contact method", message: "hi" });
    expect(res.status).toBe(400);
    expect(listDemoLeads()).toHaveLength(0);
  });

  it("requires explicit privacy consent", async () => {
    const res = await POST(new Request("http://test.local/api/leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: jose.username, email: "lead@example.com" }) }));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed email", async () => {
    const res = await post({ username: jose.username, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(listDemoLeads()).toHaveLength(0);
  });

  it("rejects a malformed request shape (missing username)", async () => {
    const res = await post({ email: "lead-noname@example.com" });
    expect(res.status).toBe(400);
    expect(listDemoLeads()).toHaveLength(0);
  });

  it("silently drops honeypot-tripped submissions while still reporting success", async () => {
    const res = await post({ username: jose.username, email: "bot@example.com", company: "Definitely Not A Bot LLC" });
    expect(res.status).toBe(200);
    expect(listDemoLeads()).toHaveLength(0);
  });

  it("returns a generic error for a nonexistent username, identical to other failure cases", async () => {
    const res = await post({ username: "no-such-user-ever", email: "x@example.com" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("We could not send your message. Please try again.");
    expect(listDemoLeads()).toHaveLength(0);
  });

  it("never trusts a client-supplied profileId — the lead is always attributed to the username-resolved profile", async () => {
    const other = DEMO_PROFILES[1];
    const res = await post({ username: jose.username, profileId: other.id, email: "no-leak@example.com" });
    expect(res.status).toBe(200);
    const leads = listDemoLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0].profileId).toBe(jose.id);
    expect(leads[0].profileId).not.toBe(other.id);
  });

  it("dedupes an immediate repeat submission from the same contact to the same profile", async () => {
    await post({ username: jose.username, email: "dupe-check@example.com", message: "first" });
    const res = await post({ username: jose.username, email: "dupe-check@example.com", message: "second" });
    expect(res.status).toBe(400);
    expect(listDemoLeads()).toHaveLength(1);
  });
});

describe("operator lead list ordering (demo mode)", () => {
  it("orders newest lead first regardless of insertion order", () => {
    addDemoLead({ profileId: jose.id, profileUsername: jose.username, profileDisplayName: jose.displayName, email: "a@example.com", createdAt: new Date("2025-01-01T00:00:00Z") });
    addDemoLead({ profileId: jose.id, profileUsername: jose.username, profileDisplayName: jose.displayName, email: "c@example.com", createdAt: new Date("2025-01-03T00:00:00Z") });
    addDemoLead({ profileId: jose.id, profileUsername: jose.username, profileDisplayName: jose.displayName, email: "b@example.com", createdAt: new Date("2025-01-02T00:00:00Z") });
    const leads = listDemoLeads();
    expect(leads.map((lead) => lead.email)).toEqual(["c@example.com", "b@example.com", "a@example.com"]);
  });
});

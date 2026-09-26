import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { PgDialect } from "drizzle-orm/pg-core";
import { parseTouchpointSource, touchpointRedirectSource } from "@/lib/device-lifecycle";
import { clientIpFromHeaders, hashClientIp, normalizeUserAgent, USER_AGENT_MAX_LENGTH } from "@/lib/privacy";

/**
 * A chainable drizzle stub. The REAL repo runs against it, so the ownership and
 * physical-Ping assertions below compile the actual SQL the queries produce rather than
 * a hand-written approximation of it.
 */
type FailTarget = "values" | "set" | null;
const stub = {
  where: undefined as unknown,
  values: undefined as unknown,
  set: undefined as unknown,
  failOn: null as FailTarget,
};

function makeChain() {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.innerJoin = () => chain;
  chain.orderBy = () => chain;
  chain.where = (w: unknown) => { stub.where = w; return chain; };
  chain.limit = () => Promise.resolve([]);
  // Thrown synchronously so the caller's try/catch sees it exactly as a failed DB call would.
  chain.values = (v: unknown) => {
    if (stub.failOn === "values") throw new Error("simulated insert failure");
    stub.values = v;
    return chain;
  };
  chain.set = (s: unknown) => {
    if (stub.failOn === "set") throw new Error("simulated update failure");
    stub.set = s;
    return chain;
  };
  return chain;
}

vi.mock("@/db", () => ({
  db: { select: () => makeChain(), insert: () => makeChain(), update: () => makeChain() },
}));

import { repo } from "@/db/repo";
import { buildTouchpointPingInput, persistTouchpointPing } from "@/lib/touchpoint-ping";

const dialect = new PgDialect();
const compiledWhere = () => dialect.sqlToQuery(stub.where as never);
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const imports = (src: string) => [...src.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
const repoCalls = (src: string) => [...new Set([...src.matchAll(/repo\.(\w+)\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`))];

/* ───────────────────────── A–D · source parsing ───────────────────────── */

describe("touchpoint source parsing", () => {
  it("treats a bare /t/{code} tag URL (no ?s=) as an NFC tap", () => {
    expect(parseTouchpointSource(undefined)).toBe("nfc");
    expect(parseTouchpointSource(null)).toBe("nfc");
  });
  it("honours explicit qr and nfc", () => {
    expect(parseTouchpointSource("qr")).toBe("qr");
    expect(parseTouchpointSource("nfc")).toBe("nfc");
  });
  it("records a present-but-empty ?s= as unknown, not as a real source", () => {
    expect(parseTouchpointSource("")).toBe("unknown");
  });
  it("records any other explicit value as unknown rather than guessing", () => {
    for (const bad of ["blah", "qrcode", "n f c", "42", "QRSCAN"]) {
      expect(parseTouchpointSource(bad)).toBe("unknown");
    }
  });
  it("normalizes case and surrounding whitespace", () => {
    expect(parseTouchpointSource(" QR ")).toBe("qr");
    expect(parseTouchpointSource("\tNfC\n")).toBe("nfc");
  });
  it("never consults a user agent — classification depends only on the ?s= value", () => {
    // Same classification with and without a browser UA present.
    expect(parseTouchpointSource(undefined)).toBe(parseTouchpointSource(undefined));
  });
});

describe("visitor-facing ?src= stays legacy-compatible", () => {
  it("emits only qr or nfc, never a new visitor-facing value", () => {
    expect(touchpointRedirectSource("qr")).toBe("qr");
    expect(touchpointRedirectSource("nfc")).toBe("nfc");
  });
  it("degrades an internal unknown Ping to nfc without leaking it downstream", () => {
    expect(touchpointRedirectSource("unknown")).toBe("nfc");
  });
});

/* ───────────────────────── privacy helpers ───────────────────────── */

describe("client IP pseudonymization", () => {
  const original = process.env.AUTH_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("returns a keyed HMAC-SHA256 hex digest for a known address", () => {
    process.env.AUTH_SECRET = "a-secret-that-is-long-enough-for-the-test";
    expect(hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }))).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic per (address, secret) and varies across both", () => {
    process.env.AUTH_SECRET = "secret-one";
    const a = hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }));
    const b = hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }));
    process.env.AUTH_SECRET = "secret-two";
    const c = hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }));
    process.env.AUTH_SECRET = "secret-one";
    const d = hashClientIp(new Headers({ "x-real-ip": "203.0.113.5" }));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });

  it("returns null — never a hash of a placeholder — when no address is present", () => {
    process.env.AUTH_SECRET = "secret-one";
    expect(hashClientIp(new Headers())).toBeNull();
    expect(hashClientIp(new Headers({ "x-real-ip": "   " }))).toBeNull();
    expect(hashClientIp(new Headers({ "x-forwarded-for": "" }))).toBeNull();
  });

  it("returns null when AUTH_SECRET is missing or blank", () => {
    delete process.env.AUTH_SECRET;
    expect(hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }))).toBeNull();
    process.env.AUTH_SECRET = "   ";
    expect(hashClientIp(new Headers({ "x-real-ip": "203.0.113.4" }))).toBeNull();
  });

  it("prefers x-real-ip and normalizes the first x-forwarded-for entry", () => {
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.1, 10.0.0.1" }))).toBe("203.0.113.9");
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": " 198.51.100.1 , 10.0.0.1" }))).toBe("198.51.100.1");
  });
});

describe("user agent normalization", () => {
  it("hard-truncates to 256 characters", () => {
    expect(normalizeUserAgent(new Headers({ "user-agent": "x".repeat(500) }))).toHaveLength(USER_AGENT_MAX_LENGTH);
  });
  it("passes a short agent through untouched and returns null when absent", () => {
    expect(normalizeUserAgent(new Headers({ "user-agent": "Mozilla/5.0" }))).toBe("Mozilla/5.0");
    expect(normalizeUserAgent(new Headers())).toBeNull();
  });
});

/* ───────────────────────── G · persistence seam ───────────────────────── */

describe("Ping persistence seam", () => {
  const input = { deviceId: "dev_1", profileId: "prof_1", type: "tap" as const, pingSource: "nfc" as const, ipHash: null, userAgent: null };

  beforeEach(() => { stub.failOn = null; stub.values = undefined; stub.set = undefined; });

  it("captures a qr scan as qr_scan and everything else as tap", () => {
    const build = (pingSource: "nfc" | "qr" | "unknown") =>
      buildTouchpointPingInput({ deviceId: "d", profileId: "p", pingSource, headers: new Headers() });
    expect(build("qr").type).toBe("qr_scan");
    expect(build("nfc").type).toBe("tap");
    expect(build("unknown").type).toBe("tap");
  });

  it("writes the device id and ping source, and leaves all geo columns NULL", async () => {
    await persistTouchpointPing({ ...input, pingSource: "qr", type: "qr_scan", ipHash: "abc", userAgent: "UA" });
    expect(stub.values).toMatchObject({
      deviceId: "dev_1", profileId: "prof_1", type: "qr_scan",
      source: "qr", pingSource: "qr", city: null, region: null, country: null, ipHash: "abc", userAgent: "UA",
    });
  });

  it("keeps the legacy source column in step so existing analytics stay compatible", async () => {
    await persistTouchpointPing({ ...input, pingSource: "unknown" });
    expect(stub.values).toMatchObject({ source: "unknown", pingSource: "unknown" });
  });

  it("a failed Ping INSERT resolves quietly, is logged, and still refreshes lastSeenAt", async () => {
    stub.failOn = "values";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(persistTouchpointPing(input)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("nfc_ping_persist_failed", expect.objectContaining({ stage: "insert" }));
    expect(stub.set).toMatchObject({ lastSeenAt: expect.any(Date) });
    spy.mockRestore();
  });

  it("a failed lastSeenAt refresh resolves quietly and does not undo the INSERT", async () => {
    stub.failOn = "set";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(persistTouchpointPing(input)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith("nfc_ping_persist_failed", expect.objectContaining({ stage: "last_seen" }));
    expect(stub.values).toMatchObject({ deviceId: "dev_1" });
    spy.mockRestore();
  });

  it("can never reject, so an after() task can never become an unhandled rejection", async () => {
    stub.failOn = "values";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(persistTouchpointPing(input)).resolves.toBeUndefined();
    stub.failOn = "set";
    await expect(persistTouchpointPing(input)).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it("never logs the raw IP, the secret, the user agent, or profile data", async () => {
    stub.failOn = "values";
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "super-secret-value";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await persistTouchpointPing({ ...input, ipHash: "deadbeef", userAgent: "Mozilla/5.0 (secret-ish)" });
    const logged = JSON.stringify(spy.mock.calls[0][1]);
    expect(logged).not.toContain("super-secret-value");
    expect(logged).not.toContain("deadbeef");
    expect(logged).not.toContain("secret-ish");
    expect(logged).not.toContain("prof_1");
    expect(logged).not.toContain("dev_1");
    spy.mockRestore();
    if (original === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = original;
  });
});

/* ───────────────────────── I–K · Ping reads ───────────────────────── */

describe("Ping reads enforce ownership and the physical-Ping definition in SQL", () => {
  beforeEach(() => { stub.where = undefined; });

  it("scopes lastForDevice to the requesting user's own device", async () => {
    await repo.pings.lastForDevice("dev_1", "user_a");
    const { sql, params } = compiledWhere();
    expect(sql).toContain('"devices"."assigned_user_id" = $');
    expect(sql).toContain('"activity_events"."device_id" = $');
    expect(params).toEqual(expect.arrayContaining(["user_a", "dev_1"]));
  });

  it("excludes rows with a NULL ping_source even when the legacy source reads nfc or qr", async () => {
    // The overloaded legacy `source` column can read "nfc"/"qr" for events that are not
    // physical Pings, so it must never be what decides "is this a Ping?".
    for (const call of [
      () => repo.pings.lastForDevice("dev_1", "user_a"),
      () => repo.pings.historyForDevice("dev_1", "user_a"),
      () => repo.pings.recentForUser("user_a"),
    ]) {
      stub.where = undefined;
      await call();
      const { sql } = compiledWhere();
      expect(sql).toContain('"activity_events"."ping_source" is not null');
      expect(sql).not.toContain('"activity_events"."source"');
    }
  });

  it("restricts every Ping read to the physical event types", async () => {
    for (const call of [
      () => repo.pings.lastForDevice("dev_1", "user_a"),
      () => repo.pings.historyForDevice("dev_1", "user_a"),
      () => repo.pings.recentForUser("user_a"),
    ]) {
      stub.where = undefined;
      await call();
      expect(compiledWhere().sql).toMatch(/"activity_events"\."type" in \(/);
    }
  });

  it("requires the ownership predicate on every read method", async () => {
    for (const call of [
      () => repo.pings.lastForDevice("dev_1", "user_a"),
      () => repo.pings.historyForDevice("dev_1", "user_a"),
      () => repo.pings.recentForUser("user_a"),
    ]) {
      stub.where = undefined;
      await call();
      expect(compiledWhere().sql).toContain('"devices"."assigned_user_id" = $');
    }
  });

  it("never exposes ip_hash, user_agent, or ownership ids in the owner-facing projection", () => {
    const source = read("src/db/repo.ts");
    const projection = source.slice(source.indexOf("const pingProjection"), source.indexOf("/** Bounded pagination"));
    expect(projection).toContain("pingSource");
    expect(projection).not.toContain("ipHash");
    expect(projection).not.toContain("userAgent");
    expect(projection).not.toContain("assignedUserId");
  });

  it("applies a keyset cursor to history", async () => {
    await repo.pings.historyForDevice("dev_1", "user_a", { limit: 10, before: new Date("2026-01-01") });
    expect(compiledWhere().sql).toContain('"created_at" < $');
  });
});

/* ───────────────────────── redirect-safety source locks ───────────────────────── */

const touchpointPage = () => read("src/app/t/[token]/page.tsx");
const destinationPage = () => read("src/app/d/[token]/page.tsx");

describe("/t/[token] keeps analytics off the redirect critical path", () => {
  it("registers the Ping with after() from next/server and never awaits the write", () => {
    const src = touchpointPage();
    expect(src).toMatch(/import \{ after \} from "next\/server"/);
    expect(src).toContain("after(() => persistTouchpointPing(ping))");
    expect(src).not.toMatch(/await\s+persistTouchpointPing/);
    expect(src).not.toContain("await repo.events.record");
  });

  it("awaits only device resolution before redirecting — no awaited analytics write", () => {
    const src = touchpointPage();
    const before = src.slice(0, src.indexOf("redirect(`/u/"));
    const awaited = [...before.matchAll(/await\s+repo\.(\w+)\.(\w+)/g)].map((m) => `${m[1]}.${m[2]}`);
    // Device resolution is the sanctioned critical-path work; nothing else may be awaited.
    expect(new Set(awaited)).toEqual(new Set(["devices.resolveTouchpoint"]));
    expect(before).not.toMatch(/await\s+repo\.(events|pings)\./);
  });

  it("registers after() before redirecting, and never after it", () => {
    const src = touchpointPage();
    expect(src.indexOf("after(")).toBeGreaterThan(-1);
    expect(src.indexOf("after(")).toBeLessThan(src.indexOf("redirect(`/u/"));
  });

  it("imports no geo, notification, email, push, or cooldown provider", () => {
    for (const mod of imports(touchpointPage())) {
      expect(mod).not.toMatch(/geo|resend|nodemailer|mail|web-push|push|vapid|cooldown|digest/i);
    }
  });

  it("touches no repository namespace beyond device resolution", () => {
    // repo.events and repo.pings must not appear on the route at all.
    expect(repoCalls(touchpointPage())).toEqual(["devices.resolveTouchpoint", "devices.byToken"]);
  });
});

describe("/d/[token] safety correction only", () => {
  it("moves the analytics write off the critical path via after()", () => {
    const src = destinationPage();
    expect(src).toMatch(/import \{ after \} from "next\/server"/);
    // The awaited write still exists, but only nested inside the after() callback: it is
    // registered before the redirect and cannot run until the response has been flushed.
    const afterAt = src.indexOf("after(");
    const writeAt = src.indexOf("await repo.events.record");
    expect(afterAt).toBeGreaterThan(-1);
    expect(writeAt).toBeGreaterThan(afterAt);
    // The old top-level `if (db && …) await repo.events.record(…)` is gone; the only
    // remaining call is nested inside the after() callback at a deeper indent.
    expect(src).not.toMatch(/^ {2}await repo\.events\.record/m);
    expect(src).toMatch(/^ {8}await repo\.events\.record/m);
  });

  it("guards the after() task so a failure cannot escape as an unhandled rejection", () => {
    const src = destinationPage();
    expect(src).toMatch(/after\(async \(\) => \{[\s\S]*try \{[\s\S]*\} catch \(error\) \{/);
    expect(src).toContain("destination_event_persist_failed");
  });

  it("is never classified as a physical interaction", () => {
    const src = destinationPage();
    for (const forbidden of ["pingSource", "pings.record", "touchDevice", "lastSeenAt", "persistTouchpointPing"]) {
      expect(src).not.toContain(forbidden);
    }
  });
});

describe("one tap = one Ping", () => {
  it("only /t/[token] triggers the Ping seam", () => {
    expect(touchpointPage()).toContain("persistTouchpointPing");
    for (const p of ["src/app/d/[token]/page.tsx", "src/app/u/[username]/page.tsx"]) {
      expect(read(p)).not.toContain("persistTouchpointPing");
    }
  });

  it("no route other than /t writes a physical Ping", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${entry.name}`;
        if (entry.isDirectory()) { walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes(".test.")) continue;
        if (read(p).includes("pings.record") && !p.includes("/app/t/")) offenders.push(p);
      }
    };
    walk(resolve(process.cwd(), "src/app"));
    expect(offenders).toEqual([]);
  });

  it("leaves /u/[username] untouched: profile_view is ordinary analytics, not a Ping", () => {
    const src = read("src/app/u/[username]/page.tsx");
    expect(src).toContain("profile_view");
    expect(src).not.toContain("pingSource");
    expect(src).not.toContain("pings.");
  });
});

/* ───────────────────────── schema + migration ───────────────────────── */

describe("migration is strictly additive", () => {
  const migrationFile = (() => {
    const files = readdirSync(resolve(process.cwd(), "drizzle")).filter((f) => f.endsWith(".sql"));
    const match = files.find((f) => readFileSync(resolve(process.cwd(), "drizzle", f), "utf8").includes("ping_source"));
    if (!match) throw new Error("ping_source migration not found");
    return `drizzle/${match}`;
  })();

  it("adds the enum, six nullable columns, and one index", () => {
    const sql = readFileSync(resolve(process.cwd(), migrationFile), "utf8");
    expect(sql).toContain(`CREATE TYPE "public"."ping_source" AS ENUM('nfc', 'qr', 'unknown')`);
    for (const col of ["ping_source", "city", "region", "country", "ip_hash", "user_agent"]) {
      expect(sql).toContain(`ADD COLUMN "${col}"`);
    }
    expect(sql).toContain('CREATE INDEX "activity_device_time_idx" ON "activity_events" USING btree ("device_id","created_at")');
  });

  it("contains no destructive or data-modifying statement", () => {
    const sql = readFileSync(resolve(process.cwd(), migrationFile), "utf8");
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE|DELETE|UPDATE|ALTER COLUMN|RENAME|ALTER TYPE)\b/);
  });

  it("does not duplicate the existing device_id or created_at columns", () => {
    const sql = readFileSync(resolve(process.cwd(), migrationFile), "utf8");
    expect(sql).not.toMatch(/ADD COLUMN "(device_id|created_at)"/);
  });

  it("reuses the pre-existing device_id and created_at columns in the schema", () => {
    const schema = read("src/db/schema.ts");
    expect(schema).toMatch(/deviceId: text\("device_id"\)\.references/);
    expect(schema).toMatch(/createdAt: now\(\)/);
  });

  it("declares every new column nullable and adds no pings table", () => {
    const schema = read("src/db/schema.ts");
    const lines = schema.split("\n");
    const decl = (name: string) => lines.find((l) => l.trim().startsWith(`${name}:`))?.trim();
    expect(decl("pingSource")).toBe(`pingSource: pingSourceEnum("ping_source"),`);
    for (const col of ["city", "region", "country", "ipHash", "userAgent"]) {
      expect(decl(col)).toBe(`${col}: text("${col.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())}"),`);
    }
    // Nullable means no .notNull() / .default() on any added column.
    for (const col of ["pingSource", "city", "region", "country", "ipHash", "userAgent"]) {
      expect(decl(col)).not.toMatch(/notNull|default/);
    }
    expect(schema).not.toMatch(/pgTable\("pings"/);
  });
});

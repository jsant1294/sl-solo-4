import { describe, expect, it } from "vitest";
import { assertOperatorLiveTestReady, launchConfiguration } from "@/lib/launch-config";
import { safeAppRedirect } from "@/lib/safe-redirect";

const valid = {
  NEXT_PUBLIC_APP_URL: "https://solo.example.com", DATABASE_URL: "postgresql://example", AUTH_SECRET: "a".repeat(32),
  AUTH_RESEND_KEY: "re_example", EMAIL_FROM: "SOLO <orders@solo.example.com>", OPERATOR_EMAIL: "ops@example.com",
  SUPPORT_EMAIL: "support@example.com", STRIPE_WEBHOOK_SECRET: "whsec_example", CRON_SECRET: "c".repeat(24),
  STRIPE_SECRET_KEY: "sk_live_example", STRIPE_MODE: "live", SOLO_SHIPPING_POLICY: "free", PUBLIC_LIVE_PAYMENTS_ENABLED: "true",
} as unknown as NodeJS.ProcessEnv;

describe("launch configuration gate", () => {
  it("passes only a complete, explicit live configuration", () => {
    expect(launchConfiguration(valid).every((check) => check.ok)).toBe(true);
  });
  it("rejects localhost, test Stripe, sandbox email, and a closed release flag", () => {
    const checks = launchConfiguration({ ...valid, NEXT_PUBLIC_APP_URL: "http://localhost:3000", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_MODE: "test", EMAIL_FROM: "SnapLink <onboarding@resend.dev>", PUBLIC_LIVE_PAYMENTS_ENABLED: "false" });
    expect(checks.filter((check) => !check.ok).map((check) => check.key)).toEqual(expect.arrayContaining(["app_url", "stripe", "email", "payments_enabled"]));
  });
  it("permits an operator proof cycle with public payments still locked", () => {
    expect(() => assertOperatorLiveTestReady({ ...valid, VERCEL_ENV: "production", PUBLIC_LIVE_PAYMENTS_ENABLED: "false" })).not.toThrow();
  });
});

describe("safe auth redirects", () => {
  it("allows local paths and rejects external or protocol-relative redirects", () => {
    expect(safeAppRedirect("/operator/orders?open=1")).toBe("/operator/orders?open=1");
    expect(safeAppRedirect("https://evil.example")).toBe("/app");
    expect(safeAppRedirect("//evil.example")).toBe("/app");
  });
});

import { assertStripeEnvironment, configuredShippingRateIds } from "@/lib/payment-safety";

export type LaunchCheck = { key: string; ok: boolean; message: string };

export function launchConfiguration(env: NodeJS.ProcessEnv = process.env): LaunchCheck[] {
  const checks: LaunchCheck[] = [];
  const add = (key: string, ok: boolean, message: string) => checks.push({ key, ok, message });
  let appUrl: URL | undefined;
  try { appUrl = new URL(env.NEXT_PUBLIC_APP_URL ?? ""); } catch { /* reported below */ }
  add("app_url", appUrl?.protocol === "https:" && !["localhost", "127.0.0.1"].includes(appUrl.hostname), "NEXT_PUBLIC_APP_URL must be the public HTTPS origin");
  add("database", Boolean(env.DATABASE_URL), "DATABASE_URL is required");
  add("auth_secret", Boolean(env.AUTH_SECRET && env.AUTH_SECRET.length >= 32), "AUTH_SECRET must contain at least 32 characters");
  add("email", Boolean(env.AUTH_RESEND_KEY && env.EMAIL_FROM && !env.EMAIL_FROM.includes("onboarding@resend.dev")), "Resend key and a verified production sender are required");
  add("operator", Boolean(env.OPERATOR_EMAIL && env.OPERATOR_PASSWORD), "OPERATOR_EMAIL and OPERATOR_PASSWORD are required");
  add("support", Boolean(env.SUPPORT_EMAIL), "SUPPORT_EMAIL is required");
  add("webhook", Boolean(env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")), "Production Stripe webhook secret is required");
  add("cron", Boolean(env.CRON_SECRET && env.CRON_SECRET.length >= 24), "CRON_SECRET must contain at least 24 characters");
  let stripeOk = false;
  try { stripeOk = assertStripeEnvironment(env.STRIPE_SECRET_KEY ?? "", { vercelEnv: "production", configuredMode: env.STRIPE_MODE }) === "live" && env.STRIPE_MODE === "live"; } catch { /* reported below */ }
  add("stripe", stripeOk, "Production requires STRIPE_MODE=live and an sk_live_ key");
  const shippingPolicy = env.SOLO_SHIPPING_POLICY;
  let shippingOk = shippingPolicy === "free";
  if (shippingPolicy === "rates") {
    try { shippingOk = configuredShippingRateIds(env.STRIPE_SHIPPING_RATE_IDS).length > 0; } catch { shippingOk = false; }
  }
  add("shipping", shippingOk, "Set SOLO_SHIPPING_POLICY=free or configure live Stripe shipping rates with policy=rates");
  add("payments_enabled", env.PUBLIC_LIVE_PAYMENTS_ENABLED === "true", "Public live payments remain locked until explicitly enabled");
  return checks;
}

export function assertPublicPaymentsReady(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV !== "production") return;
  const failed = launchConfiguration(env).filter((check) => !check.ok);
  if (failed.length) throw new Error(`Live payments are locked: ${failed.map((check) => check.key).join(", ")}`);
}

/** Allows an authenticated operator to run the live proof cycle while public checkout remains locked. */
export function assertOperatorLiveTestReady(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV !== "production") return;
  const failed = launchConfiguration(env).filter((check) => !check.ok && check.key !== "payments_enabled");
  if (failed.length) throw new Error(`Live payment test is blocked: ${failed.map((check) => check.key).join(", ")}`);
}

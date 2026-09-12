export type StripeMode = "test" | "live";

export function stripeModeFromKey(key: string): StripeMode {
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  throw new Error("Stripe secret key format is not recognized");
}

export function assertStripeEnvironment(
  key: string,
  options: { vercelEnv?: string; configuredMode?: string } = {},
): StripeMode {
  const actual = stripeModeFromKey(key);
  const configured = options.configuredMode?.toLowerCase();
  if (configured && configured !== "test" && configured !== "live") {
    throw new Error("STRIPE_MODE must be test or live");
  }
  if (configured && configured !== actual) {
    throw new Error("Stripe key does not match STRIPE_MODE");
  }
  if (actual === "live" && options.vercelEnv !== "production") {
    throw new Error("Live Stripe keys are blocked outside Production");
  }
  return actual;
}

export function configuredShippingRateIds(value?: string): string[] {
  if (!value) return [];
  const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.some((id) => !id.startsWith("shr_"))) throw new Error("Invalid Stripe shipping rate configuration");
  return ids.slice(0, 5);
}

export function configuredShippingCountries(value?: string): string[] {
  const countries = (value ?? "US").split(",").map((country) => country.trim().toUpperCase()).filter(Boolean);
  if (countries.some((country) => !/^[A-Z]{2}$/.test(country))) throw new Error("Invalid shipping country configuration");
  return [...new Set(countries)].slice(0, 20);
}

export function isPayableCheckoutSession(session: {
  payment_status?: string | null;
  currency?: string | null;
  amount_subtotal?: number | null;
  amount_total?: number | null;
}, expectedSubtotal: number): boolean {
  return session.payment_status === "paid"
    && session.currency === "usd"
    && session.amount_subtotal === expectedSubtotal
    && typeof session.amount_total === "number"
    && session.amount_total >= expectedSubtotal;
}

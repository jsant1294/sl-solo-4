import { describe, it, expect, beforeEach } from "vitest";
import { getProducts, getProductBySlug, getFeatured, getKidsProducts, dollars, getOrderById, getProductById, DEMO_ORDERS } from "@/db/commerce-demo";
import { applyStartProduction, applyAssignDevice, applyMarkReadyToShip, applyMarkShipped } from "@/lib/fulfillment";
import { priceCart } from "@/lib/cart";
import { assertStripeEnvironment, configuredShippingCountries, configuredShippingRateIds, isPayableCheckoutSession } from "@/lib/payment-safety";

describe("product catalog", () => {
  it("returns active products sorted", () => {
    const p = getProducts({ activeOnly: true });
    expect(p.length).toBeGreaterThan(0);
    for (let i = 1; i < p.length; i++) expect(p[i].sortOrder >= p[i - 1].sortOrder).toBe(true);
  });
  it("resolves by slug", () => {
    expect(getProductBySlug("nfc-card")?.name).toBe("NFC Card");
    expect(getProductBySlug("nope")).toBeUndefined();
  });
  it("featured and kids filters work", () => {
    expect(getFeatured().every((p) => p.featured)).toBe(true);
    expect(getKidsProducts().every((p) => p.profileTypesSupported.includes("kids"))).toBe(true);
  });
  it("formats prices from cents", () => {
    expect(dollars(2900)).toBe("$29");
    expect(dollars(3450)).toBe("$34.50");
  });
});

describe("variant pricing math", () => {
  it("adds variant delta to base price", () => {
    const p = getProductById("prod_plate")!;            // Phone Tag base 3900
    const gold = p.variants.find((v) => v.id === "v_plate_gold")!; // +500
    expect(p.basePrice + gold.priceDelta).toBe(4400);
  });
});

describe("server checkout pricing", () => {
  it("prices a valid line from the catalog", async () => {
    const result = await priceCart([{ productId: "prod_plate", variantId: "v_plate_gold", quantity: 2 }]);
    expect(result.subtotal).toBe(8800);
    expect(result.rows[0].unitPrice).toBe(4400);
  });

  it("rejects missing products and invalid variants", async () => {
    await expect(priceCart([{ productId: "missing", variantId: null, quantity: 1 }])).rejects.toThrow();
    await expect(priceCart([{ productId: "prod_card", variantId: "made-up", quantity: 1 }])).rejects.toThrow();
  });

  it("rejects invalid quantities and unsupported personalization", async () => {
    await expect(priceCart([{ productId: "prod_card", variantId: "v_card_obs", quantity: 11 }])).rejects.toThrow();
    await expect(priceCart([{ productId: "prod_plate", variantId: "v_plate_obs", personalization: "Not allowed", quantity: 1 }])).rejects.toThrow();
  });
});

describe("Stripe payment safety", () => {
  it("keeps test and live mode separated", () => {
    expect(assertStripeEnvironment("sk_test_placeholder", { vercelEnv: "preview", configuredMode: "test" })).toBe("test");
    expect(() => assertStripeEnvironment("sk_live_placeholder", { vercelEnv: "preview" })).toThrow();
    expect(() => assertStripeEnvironment("sk_test_placeholder", { configuredMode: "live" })).toThrow();
  });

  it("validates constrained shipping configuration", () => {
    expect(configuredShippingRateIds("shr_one, shr_two,shr_one")).toEqual(["shr_one", "shr_two"]);
    expect(configuredShippingCountries("us,ca,US")).toEqual(["US", "CA"]);
    expect(() => configuredShippingRateIds("price_wrong")).toThrow();
  });

  it("requires a paid matching USD Checkout Session", () => {
    expect(isPayableCheckoutSession({ payment_status: "paid", currency: "usd", amount_subtotal: 2900, amount_total: 3400 }, 2900)).toBe(true);
    expect(isPayableCheckoutSession({ payment_status: "unpaid", currency: "usd", amount_subtotal: 2900, amount_total: 3400 }, 2900)).toBe(false);
    expect(isPayableCheckoutSession({ payment_status: "paid", currency: "usd", amount_subtotal: 1, amount_total: 3400 }, 2900)).toBe(false);
  });
});

describe("fulfillment flow (payment vs fulfillment separate)", () => {
  const OID = "ord_1";
  beforeEach(() => {
    const o = getOrderById(OID)!;
    o.fulfillmentState = "unfulfilled";
    o.items.forEach((i) => (i.deviceId = null));
    o.trackingNumber = null;
  });

  it("a paid order still starts unfulfilled", () => {
    const o = getOrderById(OID)!;
    expect(o.paymentState).toBe("paid");
    expect(o.fulfillmentState).toBe("unfulfilled");
  });

  it("walks production → assign device → ready → shipped", async () => {
    applyStartProduction(OID);
    expect(getOrderById(OID)!.fulfillmentState).toBe("production");

    const item = getOrderById(OID)!.items[0];
    applyAssignDevice(OID, item.id);
    expect(getOrderById(OID)!.items[0].deviceId).toBeTruthy();

    applyMarkReadyToShip(OID);
    expect(getOrderById(OID)!.fulfillmentState).toBe("ready_to_ship");

    applyMarkShipped(OID, "1Z999", "UPS");
    const o = getOrderById(OID)!;
    expect(o.fulfillmentState).toBe("shipped");
    expect(o.trackingNumber).toBe("1Z999");
    expect(o.shippedAt).toBeTruthy();
  });

  it("cannot go ready-to-ship before production", async () => {
    applyMarkReadyToShip(OID); // still unfulfilled
    expect(getOrderById(OID)!.fulfillmentState).toBe("unfulfilled");
  });
});

import { Resend } from "resend";
import { assertStripeEnvironment, configuredShippingCountries, configuredShippingRateIds } from "@/lib/payment-safety";

/**
 * PROVIDER SEAMS — real when env is present, honest stub when not.
 * Status is reported at call time, never faked.
 */

/* — Storage (product images/video) — REAL Vercel Blob when token is present — */
export interface StorageProvider {
  upload(file: { name: string; data: Uint8Array; contentType: string }): Promise<{ url: string }>;
  delete(url: string): Promise<void>;
}
export const storage: StorageProvider = {
  async upload({ name, data, contentType }) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Product media storage is not configured");
    const { put } = await import("@vercel/blob");
    const safeName = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const blob = await put(`products/${Date.now()}-${safeName}`, Buffer.from(data), {
      access: "public", contentType, addRandomSuffix: true,
    });
    return { url: blob.url };
  },
  async delete(url) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Product media storage is not configured");
    const { del } = await import("@vercel/blob");
    await del(url);
  },
};

/* — Payments — REAL Stripe when STRIPE_SECRET_KEY present — */
export interface PaymentProvider {
  createCheckout(input: {
    orderId: string; email: string;
    lineItems: { name: string; amount: number; quantity: number }[];
    successUrl: string; cancelUrl: string;
  }): Promise<{ url: string; sessionId: string | null; simulated: boolean }>;
  refund(input: { orderId: string; paymentIntentId: string }): Promise<{ refundId: string }>;
  expireCheckout(sessionId: string): Promise<void>;
}
export const payments: PaymentProvider = {
  async createCheckout({ orderId, email, lineItems, successUrl, cancelUrl }) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      // STUBBED: no key → simulated success so the flow is testable pre-wire.
      return { url: `${successUrl}?order=${orderId}&simulated=1`, sessionId: null, simulated: true };
    }
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);
    const shippingRateIds = configuredShippingRateIds(process.env.STRIPE_SHIPPING_RATE_IDS);
    const allowedCountries = configuredShippingCountries(process.env.STRIPE_SHIPPING_COUNTRIES);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: orderId,
      customer_email: email,
      line_items: lineItems.map((li) => ({
        quantity: li.quantity,
        price_data: {
          currency: "usd",
          product_data: { name: li.name },
          unit_amount: li.amount, // cents
        },
      })),
      success_url: `${successUrl}?order=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { orderId },
      payment_intent_data: { metadata: { orderId } },
      shipping_address_collection: {
        allowed_countries: allowedCountries as import("stripe").Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      ...(shippingRateIds.length > 0 ? {
        shipping_options: shippingRateIds.map((shipping_rate) => ({ shipping_rate })),
      } : {}),
    }, { idempotencyKey: `solo-checkout-${orderId}` });
    return { url: session.url ?? successUrl, sessionId: session.id, simulated: false };
  },
  async refund({ orderId, paymentIntentId }) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Stripe is not configured");
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(key);
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, metadata: { orderId } }, { idempotencyKey: `solo-refund-${orderId}` });
    if (refund.status !== "succeeded" && refund.status !== "pending") throw new Error("Stripe did not accept the refund");
    return { refundId: refund.id };
  },
  async expireCheckout(sessionId) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return;
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
    const Stripe = (await import("stripe")).default;
    await new Stripe(key).checkout.sessions.expire(sessionId);
  },
};

/* — Notifications — REAL Resend when RESEND_API_KEY present — */
export interface NotificationProvider {
  operatorNewOrder(o: { orderNumber: string; email: string; total: number }): Promise<void>;
  customerOrderConfirmation(o: { orderNumber: string; email: string; total: number }): Promise<void>;
  customerShipped(o: { orderNumber: string; email: string; tracking?: string }): Promise<void>;
  operatorAlert(o: { subject: string; message: string }): Promise<void>;
}

const resendKey = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY;
const from = process.env.EMAIL_FROM ?? "SnapLink <onboarding@resend.dev>";
const operatorEmail = process.env.OPERATOR_EMAIL;
const resend = resendKey ? new Resend(resendKey) : null;
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
async function sendEmail(input: { to: string; subject: string; text: string }) {
  if (!resend) throw new Error("Email provider is not configured");
  const result = await resend.emails.send({ from, ...input });
  if (result.error) throw new Error(`Email delivery failed: ${result.error.name}`);
}

export const notifications: NotificationProvider = {
  async operatorNewOrder(o) {
    if (resend && operatorEmail) {
      await sendEmail({ to: operatorEmail, subject: `New paid order ${o.orderNumber}`,
        text: `New paid order ${o.orderNumber} from ${o.email} — ${money(o.total)}.` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Operator email is not configured");
    else { console.log(`[notify STUB] operator: new order ${o.orderNumber}`); }
  },
  async customerOrderConfirmation(o) {
    if (resend) {
      await sendEmail({ to: o.email, subject: `Your SnapLink order ${o.orderNumber}`,
        text: `Thanks for your order ${o.orderNumber} (${money(o.total)}). We'll prepare your SnapLink and email activation instructions when it ships.` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Customer email is not configured");
    else { console.log(`[notify STUB] customer confirmation ${o.orderNumber}`); }
  },
  async customerShipped(o) {
    if (resend) {
      await sendEmail({ to: o.email, subject: `Your SnapLink shipped — ${o.orderNumber}`,
        text: `Your order ${o.orderNumber} has shipped.${o.tracking ? ` Tracking: ${o.tracking}.` : ""} Tap your SnapLink to activate it.` });
    } else if (process.env.NODE_ENV === "production") throw new Error("Customer email is not configured");
    else { console.log(`[notify STUB] customer shipped ${o.orderNumber}`); }
  },
  async operatorAlert(o) {
    if (!operatorEmail) throw new Error("Operator alert email is not configured");
    await sendEmail({ to: operatorEmail, subject: o.subject, text: o.message });
  },
};

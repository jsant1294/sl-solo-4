import { NextResponse } from "next/server";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { getOrderById as getDemoOrder } from "@/db/commerce-demo";
import { isPayableCheckoutSession, assertStripeEnvironment } from "@/lib/payment-safety";
import type Stripe from "stripe";
import { fulfillmentIssueForPaidOrder } from "@/lib/device-lifecycle";
import { deliverPendingOrderNotifications } from "@/lib/order-notifications";

function orderIdFor(session: Stripe.Checkout.Session) {
  const metadataId = session.metadata?.orderId;
  return metadataId && session.client_reference_id === metadataId ? metadataId : null;
}

function shippingSnapshot(session: Stripe.Checkout.Session) {
  const extended = session as Stripe.Checkout.Session & {
    shipping_details?: Stripe.Checkout.Session.CollectedInformation.ShippingDetails | null;
  };
  const details = session.collected_information?.shipping_details ?? extended.shipping_details;
  const address = details?.address;
  if (!address) return null;
  return {
    ...(details.name ? { name: details.name } : {}),
    ...(address.line1 ? { line1: address.line1 } : {}),
    line2: address.line2 ?? null,
    ...(address.city ? { city: address.city } : {}),
    ...(address.state ? { region: address.state } : {}),
    ...(address.postal_code ? { postal: address.postal_code } : {}),
    ...(address.country ? { country: address.country } : {}),
  };
}

async function completePaidSession(session: Stripe.Checkout.Session) {
  const orderId = orderIdFor(session);
  if (!orderId) return { ok: false, status: 400, error: "Checkout order reference is invalid" };

  if (!db) {
    const order = getDemoOrder(orderId);
    if (!order || !isPayableCheckoutSession(session, order.subtotal)) {
      return { ok: false, status: 409, error: "Checkout payment does not match the order" };
    }
    if (order.paymentState === "pending") {
      order.paymentState = "paid";
      order.total = session.amount_total ?? order.total;
      order.paidAt = new Date();
    }
    return { ok: true, status: 200 };
  }

  const order = await repo.orders.byId(orderId);
  if (!order) return { ok: false, status: 404, error: "Order not found" };
  if (!order.stripeSessionId || order.stripeSessionId !== session.id) {
    // Returning a retryable response also protects the very small race between
    // Session creation and storing its ID on the pending order.
    return { ok: false, status: 409, error: "Checkout Session does not match the order" };
  }
  if (!isPayableCheckoutSession(session, order.subtotal)) {
    return { ok: false, status: 409, error: "Checkout payment does not match the order" };
  }

  const address = shippingSnapshot(session);
  const requiresShipping = order.items.some((item) => Boolean(item.hardwareProductId ?? item.productId));
  const shippingPersisted = address ? await repo.orders.updateShippingAddress(orderId, address) : false;
  const fulfillmentIssue = fulfillmentIssueForPaidOrder(requiresShipping, shippingPersisted);
  await repo.orders.setFulfillmentIssue(orderId, fulfillmentIssue);

  // The conditional database update is the idempotency boundary. Only its
  // winner records purchases or sends paid-order notifications.
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const transitioned = await repo.orders.markPaidOnce(orderId, session.amount_total ?? order.total, paymentIntentId);
  await repo.notifications.enqueuePaidOrder(orderId);
  if (fulfillmentIssue) await repo.notifications.enqueueFulfillmentIssue(orderId);

  if (transitioned) {
    for (const item of order.items) {
      if (item.productId) await repo.commerce.record({ type: "purchase", productId: item.productId, orderId });
    }
  }
  await deliverPendingOrderNotifications();
  return { ok: true, status: 200 };
}

async function completeRefund(event: Stripe.Event) {
  let orderId: string | undefined;
  let refundId: string | undefined;
  if (event.type === "refund.updated") {
    const refund = event.data.object as Stripe.Refund;
    if (refund.status !== "succeeded") return;
    orderId = refund.metadata?.orderId;
    refundId = refund.id;
    if (orderId) {
      const order = await repo.orders.byId(orderId);
      if (!order || refund.amount < order.total) return;
    }
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (!charge.refunded) return;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    const order = paymentIntentId ? await repo.orders.byStripePaymentIntent(paymentIntentId) : undefined;
    orderId = order?.id;
  }
  if (orderId) await repo.orders.markRefunded(orderId, refundId);
}

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
  } catch {
    return NextResponse.json({ error: "Stripe environment is invalid" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Stripe signature is required" }, { status: 400 });
  const raw = await req.text();
  const StripeSdk = (await import("stripe")).default;
  const stripe = new StripeSdk(key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  if (db && !(await repo.stripeEvents.begin(event.id, event.type))) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const result = await completePaidSession(event.data.object as Stripe.Checkout.Session);
      if (!result.ok) throw Object.assign(new Error(result.error), { status: result.status });
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = orderIdFor(session);
      if (orderId && db) {
        const order = await repo.orders.byId(orderId);
        if (order?.stripeSessionId === session.id) await repo.orders.markPaymentFailed(orderId);
      } else if (orderId) {
        const order = getDemoOrder(orderId);
        if (order?.paymentState === "pending") order.paymentState = "failed";
      }
    }
    if (db && (event.type === "refund.updated" || event.type === "charge.refunded")) await completeRefund(event);
    if (db) await repo.stripeEvents.complete(event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("stripe_webhook_processing_failed", { eventId: event.id, type: event.type, message });
    if (db) await repo.stripeEvents.fail(event.id, message);
    const status = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

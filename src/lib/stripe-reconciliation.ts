import { repo } from "@/db/repo";
import { assertStripeEnvironment } from "@/lib/payment-safety";
import { notifications } from "@/lib/providers";
import { deliverPendingOrderNotifications } from "@/lib/order-notifications";

export async function reconcileStripeOrders() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  assertStripeEnvironment(key, { vercelEnv: process.env.VERCEL_ENV, configuredMode: process.env.STRIPE_MODE });
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key);
  const orders = await repo.orders.reconciliationCandidates();
  const mismatches: string[] = [];
  let repaired = 0;
  for (const order of orders) {
    if (!order.stripeSessionId) continue;
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (paymentIntentId && !order.stripePaymentIntentId) {
      await repo.orders.setStripePaymentIntent(order.id, paymentIntentId);
      repaired += 1;
    }
    if (session.payment_status === "paid" && order.paymentState === "pending") mismatches.push(`${order.orderNumber}: Stripe paid / SOLO pending`);
    if (session.payment_status !== "paid" && order.paymentState === "paid") mismatches.push(`${order.orderNumber}: SOLO paid / Stripe ${session.payment_status}`);
    if (session.status === "expired" && order.paymentState === "pending") {
      if (await repo.orders.markPaymentFailed(order.id)) repaired += 1;
    }
    if (paymentIntentId && order.paymentState !== "refunded") {
      const refunds = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 10 });
      const succeeded = refunds.data.filter((refund) => refund.status === "succeeded");
      const refundedAmount = succeeded.reduce((sum, refund) => sum + refund.amount, 0);
      if (refundedAmount >= order.total && succeeded[0] && await repo.orders.markRefunded(order.id, succeeded[0].id)) repaired += 1;
    }
  }
  const delivery = await deliverPendingOrderNotifications();
  if (mismatches.length) {
    await notifications.operatorAlert({ subject: "SOLO payment reconciliation alert", message: mismatches.join("\n") });
  }
  return { checked: orders.length, repaired, mismatches, delivery };
}

"use server";
import { revalidatePath } from "next/cache";
import { readCart, writeCart, clearCart, priceCart, type CartLine } from "@/lib/cart";
import { payments, notifications } from "@/lib/providers";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { DEMO_ORDERS, nextOrderNumber } from "@/db/commerce-demo";
import { getSessionUserId } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { assertOperatorLiveTestReady, assertPublicPaymentsReady } from "@/lib/launch-config";
import { hasOperatorSession } from "@/lib/operator";

export async function addToCart(line: CartLine) {
  const safe = z.object({
    productId: z.string().min(1).max(80), variantId: z.string().max(80).nullable(),
    personalization: z.string().trim().max(20).optional(),
    customArt: z.boolean().optional(), customArtNotes: z.string().trim().max(500).optional(),
    customArtFileUrl: z.string().trim().max(600).url().optional(),
    quantity: z.number().int().min(1).max(10),
  }).parse(line);
  const cart = await readCart();
  const existing = cart.find(
    (l) => l.productId === safe.productId && l.variantId === safe.variantId && l.personalization === safe.personalization
      && l.customArt === safe.customArt && l.customArtNotes === safe.customArtNotes && l.customArtFileUrl === safe.customArtFileUrl,
  );
  if (existing) existing.quantity = Math.min(10, existing.quantity + safe.quantity);
  else cart.push(safe);
  await writeCart(cart);
  revalidatePath("/cart");
}

export async function updateQty(index: number, quantity: number) {
  if (!Number.isInteger(index) || index < 0 || !Number.isInteger(quantity) || quantity > 10) return;
  const cart = await readCart();
  if (cart[index]) {
    if (quantity <= 0) cart.splice(index, 1);
    else cart[index].quantity = quantity;
    await writeCart(cart);
  }
  revalidatePath("/cart");
}

export async function removeLine(index: number) {
  const cart = await readCart();
  cart.splice(index, 1);
  await writeCart(cart);
  revalidatePath("/cart");
}

/**
 * Checkout — creates a REAL order (DB when wired), routes through Stripe
 * (real when key present), returns redirect URL. Order starts pending;
 * the webhook flips it to paid. Simulated path only when no Stripe key.
 */
export async function checkout(input: {
  requestId: string;
  email: string; phone?: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const parsed = z.object({ requestId: z.string().uuid(), email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()), phone: z.string().trim().max(30).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email" };
  const safeInput = parsed.data;
  try {
    if (process.env.VERCEL_ENV === "production" && process.env.PUBLIC_LIVE_PAYMENTS_ENABLED !== "true") {
      if (!(await hasOperatorSession())) return { ok: false, error: "Checkout is not open yet" };
      assertOperatorLiveTestReady();
    } else assertPublicPaymentsReady();
  } catch { return { ok: false, error: "Checkout is not open yet" }; }
  const cart = await readCart();
  if (cart.length === 0) return { ok: false, error: "Cart is empty" };
  let priced: Awaited<ReturnType<typeof priceCart>>;
  try { priced = await priceCart(cart); } catch (error) { return { ok: false, error: (error as Error).message }; }
  const { rows, subtotal } = priced;

  const orderNumber = db ? `SL-${Date.now().toString(36).toUpperCase()}-${nanoid(5).toUpperCase()}` : nextOrderNumber();
  const userId = (await getSessionUserId()) ?? undefined;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const itemsInput = rows.map((r) => ({
    productId: r.productId, variantId: r.variantId, productName: r.productName,
    variantLabel: r.variantLabel, skuSnapshot: r.sku,
    hardwareProductId: r.hardwareProductId, hardwareVariantId: r.hardwareVariantId,
    personalization: r.personalization ?? null,
    customArtPriceCents: r.customArtPriceCents ?? null, customArtNotes: r.customArtNotes ?? null,
    customArtFileUrl: r.customArtFileUrl ?? null,
    quantity: r.quantity, unitPrice: r.unitPrice, deviceId: null,
  }));

  let orderId: string;

  if (db) {
    const prior = await repo.orders.byCheckoutRequest(safeInput.requestId);
    if (prior) return { ok: false, error: "This checkout is already in progress" };
    try {
      const order = await repo.orders.create({
        orderNumber, checkoutRequestId: safeInput.requestId, email: safeInput.email, phone: safeInput.phone, userId,
        subtotal, total: subtotal,
        items: itemsInput,
      });
      orderId = order.id;
    } catch {
      if (await repo.orders.byCheckoutRequest(safeInput.requestId)) return { ok: false, error: "This checkout is already in progress" };
      return { ok: false, error: "Unable to create the order" };
    }
  } else {
    // demo fallback (no DB)
    orderId = `ord_${nanoid(10)}`;
    DEMO_ORDERS.push({
      id: orderId, orderNumber, checkoutRequestId: safeInput.requestId, userId: userId ?? null, email: safeInput.email, phone: safeInput.phone ?? null,
      shippingAddressId: null, subtotal, total: subtotal, paymentState: "pending",
      fulfillmentState: "unfulfilled", fulfillmentIssue: null, stripeSessionId: null, trackingNumber: null, trackingCarrier: null,
      stripePaymentIntentId: null, stripeRefundId: null, paidAt: null, refundedAt: null, shippedAt: null, deliveredAt: null, createdAt: new Date(),
      address: null,
      items: itemsInput.map((it) => ({ ...it, id: `oi_${nanoid(8)}`, orderId })),
    });
  }

  let pay: Awaited<ReturnType<typeof payments.createCheckout>>;
  try {
    pay = await payments.createCheckout({
      orderId, email: safeInput.email,
      lineItems: rows.map((r) => ({ name: r.customArtPriceCents ? `${r.productName} + Custom Touchpoint Art` : r.productName, amount: r.unitPrice, quantity: r.quantity })),
      successUrl: `${appUrl}/order/success`,
      cancelUrl: `${appUrl}/cart`,
    });
  } catch {
    if (db) await repo.orders.markPaymentFailed(orderId);
    else {
      const order = DEMO_ORDERS.find((candidate) => candidate.id === orderId);
      if (order?.paymentState === "pending") order.paymentState = "failed";
    }
    return { ok: false, error: "Secure checkout is temporarily unavailable" };
  }

  if (db && pay.sessionId && !(await repo.orders.setStripeSession(orderId, pay.sessionId))) {
    try { await payments.expireCheckout(pay.sessionId); } catch { /* reconciliation/operator review remains required */ }
    await repo.orders.markPaymentFailed(orderId);
    return { ok: false, error: "Secure checkout is temporarily unavailable" };
  }
  if (db) for (const row of rows) await repo.commerce.record({ type: "checkout_initiated", productId: row.productId, orderId });

  // Simulated path (no Stripe key): mark paid now so golden path flows.
  if (pay.simulated) {
    if (db) {
      await repo.orders.markPaidOnce(orderId, subtotal);
      for (const row of rows) await repo.commerce.record({ type: "purchase", productId: row.productId, orderId });
      const o = await repo.orders.byId(orderId);
      if (o) {
        await notifications.operatorNewOrder({ orderNumber, email: safeInput.email, total: subtotal });
        await notifications.customerOrderConfirmation({ orderNumber, email: safeInput.email, total: subtotal });
      }
    } else {
      const o = DEMO_ORDERS.find((x) => x.id === orderId)!;
      o.paymentState = "paid"; o.paidAt = new Date();
      await notifications.operatorNewOrder({ orderNumber, email: safeInput.email, total: subtotal });
      await notifications.customerOrderConfirmation({ orderNumber, email: safeInput.email, total: subtotal });
    }
  }

  // Keep the browser cart until payment is confirmed. Stripe cancel returns to
  // /cart, so clearing here would destroy a customer's recoverable checkout.
  if (pay.simulated) await clearCart();
  return { ok: true, url: pay.url };
}

export async function clearPaidCart(orderId: string, sessionId: string): Promise<void> {
  if (!db || !orderId || !sessionId) return;
  const order = await repo.orders.byId(orderId);
  if (order?.paymentState === "paid" && order.stripeSessionId === sessionId) await clearCart();
}

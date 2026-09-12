"use server";
import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/operator";
import { db } from "@/db";
import { repo } from "@/db/repo";
import { getOrderById } from "@/db/commerce-demo";
import { notifications, payments } from "@/lib/providers";
import { deliverPendingOrderNotifications } from "@/lib/order-notifications";
import { applyStartProduction, applyAssignDevice, applyMarkReadyToShip, applyMarkShipped } from "@/lib/fulfillment";
import { z } from "zod";
import { redirect } from "next/navigation";

const shippingRepairSchema = z.object({
  name: z.string().trim().min(1).max(100), line1: z.string().trim().min(1).max(160),
  line2: z.string().trim().max(160), city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100), postal: z.string().trim().min(2).max(20),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()), phone: z.string().trim().max(30),
});

export async function repairShippingAddress(orderId: string, form: FormData) {
  await requireOperator();
  if (!db) redirect(`/operator/orders/${orderId}?repairError=${encodeURIComponent("Database required")}`);
  const parsed = shippingRepairSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect(`/operator/orders/${orderId}?repairError=${encodeURIComponent("Enter a complete valid shipping address")}`);
  const result = await repo.orders.repairShippingAddress(orderId, { ...parsed.data, line2: parsed.data.line2 || null, phone: parsed.data.phone || null });
  revalidatePath(`/operator/orders/${orderId}`);
  if (!result.ok) redirect(`/operator/orders/${orderId}?repairError=${encodeURIComponent(result.error)}`);
  redirect(`/operator/orders/${orderId}?repaired=1`);
}

export async function startProduction(orderId: string) {
  await requireOperator();
  if (db) {
    const o = await repo.orders.byId(orderId);
    if (o && o.paymentState === "paid" && !o.fulfillmentIssue && o.fulfillmentState === "unfulfilled")
      await repo.orders.setFulfillment(orderId, "production");
  } else applyStartProduction(orderId);
  revalidatePath(`/operator/orders/${orderId}`);
}

export async function assignDevice(orderId: string, itemId: string, deviceCode: string) {
  await requireOperator();
  if (db) {
    let result: Awaited<ReturnType<typeof repo.devices.assignExisting>>;
    try { result = await repo.devices.assignExisting({ orderId, itemId, deviceCode }); }
    catch { result = { ok: false, error: "Device assignment conflict" }; }
    revalidatePath(`/operator/orders/${orderId}`);
    return result;
  }
  applyAssignDevice(orderId, itemId);
  revalidatePath(`/operator/orders/${orderId}`);
  return { ok: false as const, error: "Physical provisioning requires the database" };
}

export async function markReadyToShip(orderId: string) {
  await requireOperator();
  if (db) {
    const o = await repo.orders.byId(orderId);
    if (o && !o.fulfillmentIssue && o.fulfillmentState === "production" && o.items.every((i) => i.deviceId))
      await repo.orders.setFulfillment(orderId, "ready_to_ship");
  } else applyMarkReadyToShip(orderId);
  revalidatePath(`/operator/orders/${orderId}`);
}

export async function markShipped(orderId: string, tracking: string, carrier: string) {
  await requireOperator();
  if (db) {
    const o = await repo.orders.byId(orderId);
    if (o && !o.fulfillmentIssue && o.fulfillmentState === "ready_to_ship") {
      await repo.orders.setFulfillment(orderId, "shipped", {
        trackingNumber: tracking || null, trackingCarrier: carrier || null, shippedAt: new Date(),
      });
      await repo.notifications.enqueueShipped(orderId);
      await deliverPendingOrderNotifications();
    }
  } else {
    const applied = applyMarkShipped(orderId, tracking, carrier);
    if (applied) {
      const o = getOrderById(orderId)!;
      await notifications.customerShipped({ orderNumber: o.orderNumber, email: o.email, tracking });
    }
  }
  revalidatePath(`/operator/orders/${orderId}`);
}

export async function refundOrder(orderId: string, confirmation: string) {
  await requireOperator();
  if (!db) return { ok: false as const, error: "Database required" };
  const order = await repo.orders.byId(orderId);
  if (!order) return { ok: false as const, error: "Order not found" };
  if (confirmation.trim() !== order.orderNumber) return { ok: false as const, error: "Enter the exact order number" };
  if (order.paymentState !== "paid") return { ok: false as const, error: "Only paid orders can be refunded" };
  if (!order.stripePaymentIntentId) return { ok: false as const, error: "PaymentIntent is missing; reconcile this order first" };
  try {
    const refund = await payments.refund({ orderId, paymentIntentId: order.stripePaymentIntentId });
    await repo.orders.markRefunded(orderId, refund.refundId);
    revalidatePath(`/operator/orders/${orderId}`);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Refund failed" };
  }
}

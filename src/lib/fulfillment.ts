import { getOrderById } from "@/db/commerce-demo";
import { nanoid } from "nanoid";

/**
 * Pure fulfillment state transitions — no Next/server deps, so unit-testable.
 * Server actions wrap these and add revalidatePath + notifications.
 * Returns whether the transition applied.
 */

export function applyStartProduction(orderId: string): boolean {
  const o = getOrderById(orderId);
  if (o && o.paymentState === "paid" && o.fulfillmentState === "unfulfilled") {
    o.fulfillmentState = "production";
    return true;
  }
  return false;
}

export function applyAssignDevice(orderId: string, itemId: string): boolean {
  const o = getOrderById(orderId);
  const item = o?.items.find((i) => i.id === itemId);
  if (item && !item.deviceId) {
    item.deviceId = `dev_${nanoid(8)}`;
    return true;
  }
  return false;
}

export function applyMarkReadyToShip(orderId: string): boolean {
  const o = getOrderById(orderId);
  if (o && o.fulfillmentState === "production" && o.items.every((i) => i.deviceId)) {
    o.fulfillmentState = "ready_to_ship";
    return true;
  }
  return false;
}

export function applyMarkShipped(orderId: string, tracking: string, carrier: string): boolean {
  const o = getOrderById(orderId);
  if (o && o.fulfillmentState === "ready_to_ship") {
    o.fulfillmentState = "shipped";
    o.trackingNumber = tracking || null;
    o.trackingCarrier = carrier || null;
    o.shippedAt = new Date();
    return true;
  }
  return false;
}

import { repo } from "@/db/repo";
import { notifications } from "@/lib/providers";

export async function deliverPendingOrderNotifications(limit = 25) {
  const pending = await repo.notifications.pending(limit);
  let sent = 0;
  let failed = 0;
  for (const notification of pending) {
    if (!(await repo.notifications.claim(notification.id))) continue;
    const order = await repo.orders.byId(notification.orderId);
    if (!order) {
      await repo.notifications.markFailed(notification.id, "Order not found");
      failed += 1;
      continue;
    }
    try {
      if (notification.type === "operator_new_order") {
        await notifications.operatorNewOrder({ orderNumber: order.orderNumber, email: order.email, total: order.total });
      } else if (notification.type === "customer_order_confirmation") {
        await notifications.customerOrderConfirmation({ orderNumber: order.orderNumber, email: order.email, total: order.total });
      } else if (notification.type === "customer_shipped") {
        await notifications.customerShipped({ orderNumber: order.orderNumber, email: order.email, tracking: order.trackingNumber ?? undefined });
      } else if (notification.type === "operator_fulfillment_issue") {
        await notifications.operatorAlert({ subject: `SOLO fulfillment issue ${order.orderNumber}`, message: `Paid order ${order.orderNumber} requires operator review: ${order.fulfillmentIssue ?? "unknown issue"}.` });
      } else {
        throw new Error("Unknown notification type");
      }
      await repo.notifications.markSent(notification.id);
      sent += 1;
    } catch (error) {
      await repo.notifications.markFailed(notification.id, error instanceof Error ? error.message : "Delivery failed");
      failed += 1;
    }
  }
  return { checked: pending.length, sent, failed };
}

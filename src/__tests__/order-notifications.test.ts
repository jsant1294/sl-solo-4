import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repo", () => ({ repo: {
  notifications: { pending: vi.fn(), claim: vi.fn(), markSent: vi.fn(), markFailed: vi.fn() },
  orders: { byId: vi.fn() },
} }));
vi.mock("@/lib/providers", () => ({ notifications: {
  operatorNewOrder: vi.fn(), customerOrderConfirmation: vi.fn(), customerShipped: vi.fn(), operatorAlert: vi.fn(),
} }));

import { repo } from "@/db/repo";
import { notifications } from "@/lib/providers";
import { deliverPendingOrderNotifications } from "@/lib/order-notifications";

const order = { id: "order_1", orderNumber: "SL-1", email: "buyer@example.com", total: 2900, trackingNumber: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.notifications.claim).mockResolvedValue(true);
  vi.mocked(repo.orders.byId).mockResolvedValue(order as never);
});

describe("durable order notification delivery", () => {
  it("marks a successfully delivered message sent", async () => {
    vi.mocked(repo.notifications.pending).mockResolvedValue([{ id: "n1", orderId: order.id, type: "customer_order_confirmation" }] as never);
    expect(await deliverPendingOrderNotifications()).toEqual({ checked: 1, sent: 1, failed: 0 });
    expect(notifications.customerOrderConfirmation).toHaveBeenCalledWith({ orderNumber: "SL-1", email: "buyer@example.com", total: 2900 });
    expect(repo.notifications.markSent).toHaveBeenCalledWith("n1");
  });

  it("records a delivery failure for later retry without losing the job", async () => {
    vi.mocked(repo.notifications.pending).mockResolvedValue([{ id: "n2", orderId: order.id, type: "operator_new_order" }] as never);
    vi.mocked(notifications.operatorNewOrder).mockRejectedValue(new Error("provider unavailable"));
    expect(await deliverPendingOrderNotifications()).toEqual({ checked: 1, sent: 0, failed: 1 });
    expect(repo.notifications.markFailed).toHaveBeenCalledWith("n2", "provider unavailable");
    expect(repo.notifications.markSent).not.toHaveBeenCalled();
  });

  it("does not deliver when another worker owns the claim", async () => {
    vi.mocked(repo.notifications.pending).mockResolvedValue([{ id: "n3", orderId: order.id, type: "operator_new_order" }] as never);
    vi.mocked(repo.notifications.claim).mockResolvedValue(false);
    await deliverPendingOrderNotifications();
    expect(notifications.operatorNewOrder).not.toHaveBeenCalled();
  });
});

export const normalizeDeviceCode = (value: string) => value.trim().toUpperCase();
export const isValidDeviceCode = (value: string) => /^[A-Z0-9][A-Z0-9_-]{3,63}$/.test(normalizeDeviceCode(value));
export const isProvisionableDeviceCode = (value: string) => /^[A-Z0-9][A-Z0-9_-]{11,63}$/.test(normalizeDeviceCode(value));

export type DeviceLifecycleStatus = "unclaimed" | "assigned" | "paired" | "disabled" | "lost" | "replaced";

const OPERATOR_TRANSITIONS: Record<DeviceLifecycleStatus, DeviceLifecycleStatus[]> = {
  unclaimed: ["disabled", "lost", "replaced"],
  assigned: ["disabled", "lost", "replaced"],
  paired: ["disabled", "lost", "replaced"],
  disabled: [], lost: [], replaced: [],
};

export function canOperatorTransitionDevice(from: DeviceLifecycleStatus, to: DeviceLifecycleStatus) {
  return from === to || OPERATOR_TRANSITIONS[from].includes(to);
}

export function operatorDeviceTransitions(status: DeviceLifecycleStatus) {
  return [status, ...OPERATOR_TRANSITIONS[status]];
}

export function assignmentError(input: {
  paymentState: string;
  fulfillmentState: string;
  fulfillmentIssue?: string | null;
  orderUserId?: string | null;
  itemDeviceId?: string | null;
  deviceStatus?: DeviceLifecycleStatus;
  deviceAssignedUserId?: string | null;
  deviceOrderItemId?: string | null;
  expectedProductId?: string | null;
  deviceProductId?: string | null;
  expectedVariantId?: string | null;
  deviceVariantId?: string | null;
  expectedDeviceType?: string | null;
  deviceType?: string | null;
}): string | null {
  if (input.paymentState !== "paid") return "Order is not paid";
  if (input.fulfillmentIssue) return "Order has a fulfillment issue";
  if (input.fulfillmentState !== "production") return "Order is not in production";
  if (!input.orderUserId) return "Order is not linked to a customer account";
  if (input.itemDeviceId) return "Order item already has a device";
  if (!input.deviceStatus) return "Device code not found";
  if (input.deviceStatus !== "unclaimed") return "Device is not available for assignment";
  if (input.deviceAssignedUserId || input.deviceOrderItemId) return "Device is already assigned";
  if (input.deviceProductId && input.expectedProductId && input.deviceProductId !== input.expectedProductId) return "Device product does not match the order item";
  if (input.deviceVariantId && input.expectedVariantId && input.deviceVariantId !== input.expectedVariantId) return "Device variant does not match the order item";
  if (input.expectedDeviceType && input.deviceType && input.expectedDeviceType !== input.deviceType) return "Device type does not match the order item";
  return null;
}

export function claimError(input: {
  exists: boolean;
  assignedUserId?: string | null;
  userId: string;
  status?: DeviceLifecycleStatus;
}): string | null {
  if (!input.exists) return "Device code not found";
  if (input.assignedUserId !== input.userId) return "Device is not assigned to your account";
  if (input.status === "paired") return "Device already claimed";
  if (input.status !== "assigned") return "Device is not ready to activate";
  return null;
}

export function canResolvePhysicalDevice(input: {
  status: DeviceLifecycleStatus;
  destinationActive?: boolean;
  profileStatus?: string;
}) {
  return input.status === "paired" && input.destinationActive === true && input.profileStatus === "active";
}

export function fulfillmentIssueForPaidOrder(requiresShipping: boolean, shippingPersisted: boolean) {
  return requiresShipping && !shippingPersisted ? "shipping_address_missing" : null;
}

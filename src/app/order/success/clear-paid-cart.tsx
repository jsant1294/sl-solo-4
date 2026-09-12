"use client";

import { useEffect } from "react";
import { clearPaidCart } from "@/app/(shop)/cart-actions";

export function ClearPaidCart({ orderId, sessionId }: { orderId: string; sessionId: string }) {
  useEffect(() => { void clearPaidCart(orderId, sessionId); }, [orderId, sessionId]);
  return null;
}

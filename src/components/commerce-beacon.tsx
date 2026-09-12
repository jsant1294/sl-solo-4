"use client";
import { useEffect } from "react";
export function CommerceBeacon({ type, productId }: { type: "product_view"; productId: string }) {
  useEffect(() => { fetch("/api/commerce-event", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, productId }), keepalive: true }).catch(() => undefined); }, [type, productId]);
  return null;
}

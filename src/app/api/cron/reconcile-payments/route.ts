import { NextResponse } from "next/server";
import { db } from "@/db";
import { reconcileStripeOrders } from "@/lib/stripe-reconciliation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: "Database required" }, { status: 503 });
  try {
    return NextResponse.json({ ok: true, ...(await reconcileStripeOrders()) });
  } catch (error) {
    console.error("payment_reconciliation_failed", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}

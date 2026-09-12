# SOLO payments — V1 operating contract

SOLO is the merchant of record for its own physical hardware. V1 uses one-time Stripe-hosted Checkout only. Stripe Connect and subscriptions are not implemented.

## Payment boundary

- The cart cookie contains product IDs, variant IDs, personalization, and quantity only. The server reloads active products and current prices before creating an order.
- A pending SOLO order and immutable line-item price/selection snapshots are created before Checkout.
- The SOLO order ID is copied into Checkout Session metadata, `client_reference_id`, and PaymentIntent metadata. The Checkout Session ID is stored on the order.
- Stripe's signed webhook is the payment authority. The success page never marks an order paid and only displays order information when its Session ID matches.
- `checkout.session.completed` is accepted only when `payment_status` is `paid`. Delayed methods complete through `checkout.session.async_payment_succeeded`. Failed or expired Sessions transition pending orders to failed.
- The database transition from pending to paid is conditional and atomic. Only the request that wins that transition records purchase events and sends paid-order emails.

## Shipping

`STRIPE_SHIPPING_COUNTRIES` is a comma-separated ISO country allowlist and defaults to `US`. `STRIPE_SHIPPING_RATE_IDS` is a comma-separated list of Stripe `shr_...` rate IDs. Rates must be created independently in matching test and live Stripe modes.

Stripe's final shipping address overwrites the order's shipping snapshot after payment. The final order total persists, so shipping cost is `total - subtotal` and is shown to the operator. The selected Stripe shipping-rate ID/name is retained by Stripe and linked through `stripeSessionId`; there is no dedicated Neon column in the current working schema.

## Payment methods

The integration intentionally does not hard-code `payment_method_types`. Compatible cards and wallets are controlled through Stripe's Dashboard for the relevant mode and location.

## Refunds and cancellation

Operators can submit a full refund from the order page after typing the exact order number. Stripe receives an idempotent refund request and SOLO records the refund. `refund.updated` and `charge.refunded` webhooks plus the reconciliation job synchronize dashboard-issued refunds. A refund does not automatically disable activated hardware; that remains an explicit operator decision.

## Durable side effects and recovery

Paid-order and shipped emails are written to `order_notifications` before delivery. Delivery uses a short claim lease, records attempts/errors, and is retried by hourly reconciliation. Signed Stripe event IDs and processing results are recorded in `stripe_webhook_events`. The `/operator/launch` dashboard surfaces pending/retried email, stale payment, and paid-order issue counts.

## Environment separation and release gate

- `STRIPE_MODE=test|live` may be set as an explicit guard. A key that disagrees with it is rejected.
- A live secret key is rejected outside Vercel Production.
- Test shipping-rate IDs and webhook signing secrets must never be reused in live mode.
- Never log secret values or Stripe signature details.
- Production checkout is blocked unless every launch configuration check passes and `PUBLIC_LIVE_PAYMENTS_ENABLED=true`.
- Do not enable live mode until the full test path has produced a paid order, surfaced it in Operator, started production, and assigned a device against an isolated Preview/test database.

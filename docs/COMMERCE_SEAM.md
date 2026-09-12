# COMMERCE / ACTIVATION SEAM (contract only)

Physical product → device UID → claim/activation code → guardian claims →
device attached to profile's destination.

Built now: `destinations` + `devices` tables, `/activate` flow, Stripe Checkout
initiation (`/api/checkout`, shell-safe without keys). Not built: inventory,
fulfillment, Etsy/marketplace integration, webhook persistence (seam marked
`// @wire` in the checkout route).

Key invariant: a device attaches to a DESTINATION, not a username or a profile
directly. Lost tag → issue a new device on the same destination. Contact info
changes → edit the profile; the tag is untouched.

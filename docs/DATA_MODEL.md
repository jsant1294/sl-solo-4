# DATA MODEL

Tables (src/db/schema.ts): users, profiles, profile_links, destinations,
devices, activity_events, contact_leads, upgrade_intents, hardware_orders.

profiles: + type (profileType), status (draft|active|disabled), accent,
data (jsonb, per-type payload). username unique. See PROFILE_TYPES.md.

destinations: token (unique, random), profileId, active. The stable NFC/QR
target. See ARCHITECTURE.md.

devices: destinationId (points at destination), profileId (denormalized
convenience), deviceCode unique, label, type, status.

activity_events: type = tap|qr_scan|profile_view|contact|guardian_call_click,
source. Light by design — enough to tell an owner "your SnapLink was accessed".

Kids payload (validated, src/lib/profile-data.ts):
  firstName, helpMessage?, usePhoto(false), guardians[1..4]{label,name,
  relationship?,phone,priority}, emergency?{allergies?,note?,medical?,enabled}

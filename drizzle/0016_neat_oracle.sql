ALTER TYPE "public"."commerce_event_type" ADD VALUE 'networking_kit_viewed';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'networking_kit_checkout_started';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'networking_kit_purchased';--> statement-breakpoint
ALTER TYPE "public"."device_type" ADD VALUE 'bundle';--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"source_order_id" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundle_slot_options" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_id" text NOT NULL,
	"component_product_id" text NOT NULL,
	"component_variant_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundle_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"bundle_product_id" text NOT NULL,
	"slot_key" text NOT NULL,
	"label" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"allow_customer_choice" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "bundle_group_id" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "grants_entitlement" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "grants_entitlement" text;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_source_order_id_orders_id_fk" FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_slot_options" ADD CONSTRAINT "product_bundle_slot_options_slot_id_product_bundle_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."product_bundle_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_slot_options" ADD CONSTRAINT "product_bundle_slot_options_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_slot_options" ADD CONSTRAINT "product_bundle_slot_options_component_variant_id_product_variants_id_fk" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_slots" ADD CONSTRAINT "product_bundle_slots_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_user_key_idx" ON "entitlements" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "bundle_slot_options_slot_idx" ON "product_bundle_slot_options" USING btree ("slot_id");--> statement-breakpoint
CREATE INDEX "bundle_slots_bundle_idx" ON "product_bundle_slots" USING btree ("bundle_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bundle_slots_bundle_slotkey_idx" ON "product_bundle_slots" USING btree ("bundle_product_id","slot_key");--> statement-breakpoint
CREATE INDEX "order_items_bundle_group_idx" ON "order_items" USING btree ("bundle_group_id");
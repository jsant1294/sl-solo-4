ALTER TYPE "public"."device_status" ADD VALUE 'assigned' BEFORE 'paired';--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "devices"
    GROUP BY upper(btrim("device_code"))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize device codes: case-insensitive duplicates exist';
  END IF;
END $$;--> statement-breakpoint
UPDATE "devices" SET "device_code" = upper(btrim("device_code"));--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "hardware_product_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "hardware_variant_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "sku_snapshot" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "hardware_product_id" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "hardware_variant_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_issue" text;--> statement-breakpoint
CREATE INDEX "devices_order_item_idx" ON "devices" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "devices_assigned_user_idx" ON "devices" USING btree ("assigned_user_id");

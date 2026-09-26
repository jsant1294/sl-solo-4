CREATE TYPE "public"."ping_source" AS ENUM('nfc', 'qr', 'unknown');--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "ping_source" "ping_source";--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "activity_events" ADD COLUMN "user_agent" text;--> statement-breakpoint
CREATE INDEX "activity_device_time_idx" ON "activity_events" USING btree ("device_id","created_at");
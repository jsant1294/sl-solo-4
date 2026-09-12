ALTER TYPE "public"."commerce_event_type" ADD VALUE 'purpose_view';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'purpose_selected';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'purpose_modal_open';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'purpose_product_clicked';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'purpose_all_hardware_clicked';--> statement-breakpoint
ALTER TABLE "commerce_events" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "commerce_events" ADD COLUMN "locale" text;
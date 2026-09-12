ALTER TABLE "order_items" ADD COLUMN "custom_art_price_cents" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "custom_art_notes" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_art_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "custom_art_price_cents" integer;
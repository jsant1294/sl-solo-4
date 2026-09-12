CREATE TYPE "public"."commerce_event_type" AS ENUM('video_impression', 'video_start', 'video_complete', 'video_cta_click', 'product_view', 'checkout_initiated', 'purchase');--> statement-breakpoint
ALTER TYPE "public"."device_status" ADD VALUE 'lost';--> statement-breakpoint
ALTER TYPE "public"."device_status" ADD VALUE 'replaced';--> statement-breakpoint
CREATE TABLE "commerce_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "commerce_event_type" NOT NULL,
	"product_id" text,
	"media_id" text,
	"order_id" text,
	"session_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "product_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "order_item_id" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "assigned_user_id" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "kind" text DEFAULT 'image' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "height" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "object_position" text DEFAULT '50% 50%' NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "name_es" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "short_description_es" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "full_description_es" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "video_poster_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "personalization_options" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_events" ADD CONSTRAINT "commerce_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_events" ADD CONSTRAINT "commerce_events_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "commerce_events_product_time_idx" ON "commerce_events" USING btree ("product_id","created_at");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_video_poster_id_media_id_fk" FOREIGN KEY ("video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "storefront_sections" ADD COLUMN "mobile_media_id" text;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD COLUMN "background_theme" text DEFAULT 'ivory' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD COLUMN "overlay_strength" integer DEFAULT 62 NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD COLUMN "desktop_position" text DEFAULT '50% 50%' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD COLUMN "mobile_position" text DEFAULT '65% 50%' NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_sections" ADD CONSTRAINT "storefront_sections_mobile_media_id_media_id_fk" FOREIGN KEY ("mobile_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "storefront_sections" SET "background_theme" = CASE "key"
  WHEN 'hero' THEN 'charcoal' WHEN 'see_tap' THEN 'charcoal' WHEN 'purpose' THEN 'lavender'
  WHEN 'collections' THEN 'pattern' WHEN 'hardware' THEN 'aqua' WHEN 'personalization' THEN 'coral'
  WHEN 'profile_demo' THEN 'ivory' WHEN 'how_it_works' THEN 'sand' WHEN 'trust' THEN 'sage'
  WHEN 'business' THEN 'charcoal' WHEN 'final_cta' THEN 'pattern' ELSE 'ivory' END;

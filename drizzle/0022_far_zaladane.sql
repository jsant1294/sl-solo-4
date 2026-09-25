ALTER TYPE "public"."purpose_key" ADD VALUE 'sports';--> statement-breakpoint
ALTER TYPE "public"."purpose_key" ADD VALUE 'stage';--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "image_media_id" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "example_href" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "example_label_en" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "example_label_es" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "start_href" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "start_label_en" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD COLUMN "start_label_es" text;--> statement-breakpoint
ALTER TABLE "purpose_options" ADD CONSTRAINT "purpose_options_image_media_id_media_id_fk" FOREIGN KEY ("image_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "demo_samples" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"portrait_media_id" text,
	"reel_media_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo_samples" ADD CONSTRAINT "demo_samples_portrait_media_id_media_id_fk" FOREIGN KEY ("portrait_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_samples" ADD CONSTRAINT "demo_samples_reel_media_id_media_id_fk" FOREIGN KEY ("reel_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "demo_samples_key_idx" ON "demo_samples" USING btree ("key");
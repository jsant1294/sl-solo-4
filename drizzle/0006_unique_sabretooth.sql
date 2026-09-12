CREATE TYPE "public"."purpose_key" AS ENUM('personal', 'creator', 'professional', 'share', 'protect', 'kids');--> statement-breakpoint
CREATE TABLE "purpose_options" (
	"id" text PRIMARY KEY NOT NULL,
	"key" "purpose_key" NOT NULL,
	"title_en" text NOT NULL,
	"title_es" text NOT NULL,
	"tagline_en" text NOT NULL,
	"tagline_es" text NOT NULL,
	"headline_en" text NOT NULL,
	"headline_es" text NOT NULL,
	"description_en" text NOT NULL,
	"description_es" text NOT NULL,
	"chips_en" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chips_es" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"color" text NOT NULL,
	"secondary_href" text NOT NULL,
	"privacy_points_en" jsonb,
	"privacy_points_es" jsonb,
	"character_teaser" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "purpose_options_key_idx" ON "purpose_options" USING btree ("key");
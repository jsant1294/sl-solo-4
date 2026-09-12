CREATE TYPE "public"."collection_key" AS ENUM('signature', 'color', 'patterns', 'kids');--> statement-breakpoint
CREATE TABLE "collection_options" (
	"id" text PRIMARY KEY NOT NULL,
	"key" "collection_key" NOT NULL,
	"title_en" text NOT NULL,
	"title_es" text NOT NULL,
	"note_en" text NOT NULL,
	"note_es" text NOT NULL,
	"pattern" text NOT NULL,
	"colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "collection_options_key_idx" ON "collection_options" USING btree ("key");
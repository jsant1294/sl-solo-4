CREATE TABLE "product_price_audits" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"changed_by_user_id" text,
	"old_base_price" integer NOT NULL,
	"new_base_price" integer NOT NULL,
	"old_variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"new_variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_price_audits" ADD CONSTRAINT "product_price_audits_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price_audits" ADD CONSTRAINT "product_price_audits_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_price_audits_product_time_idx" ON "product_price_audits" USING btree ("product_id","created_at");
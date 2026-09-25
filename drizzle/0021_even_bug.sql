CREATE TABLE "order_item_entitlement_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"order_item_id" text NOT NULL,
	"entitlement_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_entitlement_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"entitlement_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_item_entitlement_grants" ADD CONSTRAINT "order_item_entitlement_grants_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_entitlement_grants" ADD CONSTRAINT "product_entitlement_grants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_item_entitlement_grants_item_idx" ON "order_item_entitlement_grants" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_entitlement_grants_product_key_idx" ON "product_entitlement_grants" USING btree ("product_id","entitlement_key");
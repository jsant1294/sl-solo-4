CREATE TYPE "public"."networking_lead_source" AS ENUM('business_card_scan', 'manual');--> statement-breakpoint
CREATE TABLE "networking_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"display_name" text NOT NULL,
	"company" text,
	"job_title" text,
	"email" text,
	"phone" text,
	"website" text,
	"address_line" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"linkedin_url" text,
	"notes" text,
	"source" "networking_lead_source" DEFAULT 'manual' NOT NULL,
	"raw_extraction" text,
	"follow_up_at" timestamp with time zone,
	"last_contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"networking_enabled" boolean DEFAULT true NOT NULL,
	"card_scanner_enabled" boolean DEFAULT true NOT NULL,
	"manual_connections_enabled" boolean DEFAULT true NOT NULL,
	"follow_up_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "networking_leads" ADD CONSTRAINT "networking_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "networking_leads_user_idx" ON "networking_leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "networking_leads_user_email_idx" ON "networking_leads" USING btree ("user_id","email");--> statement-breakpoint
CREATE INDEX "networking_leads_user_phone_idx" ON "networking_leads" USING btree ("user_id","phone");
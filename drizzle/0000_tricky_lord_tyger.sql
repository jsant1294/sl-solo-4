CREATE TYPE "public"."activity_type" AS ENUM('tap', 'qr_scan', 'profile_view', 'contact', 'guardian_call_click');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('unclaimed', 'paired', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('phone_plate', 'card', 'stand', 'sticker', 'bracelet', 'keychain');--> statement-breakpoint
CREATE TYPE "public"."link_type" AS ENUM('website', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'whatsapp', 'x', 'custom');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('en', 'es');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'fulfilled', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('draft', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('personal', 'business', 'kids', 'pet', 'property', 'event', 'creator', 'other');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('nfc', 'qr', 'link', 'direct');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('obsidian', 'ivory', 'signature_gold');--> statement-breakpoint
CREATE TYPE "public"."upgrade_status" AS ENUM('open', 'contacted', 'converted', 'dismissed');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"device_id" text,
	"type" "activity_type" NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_leads" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"name" text,
	"phone" text,
	"email" text,
	"message" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"profile_id" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"device_code" text NOT NULL,
	"label" text,
	"type" "device_type" NOT NULL,
	"status" "device_status" DEFAULT 'unclaimed' NOT NULL,
	"destination_id" text,
	"profile_id" text,
	"activated_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hardware_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"stripe_session_id" text,
	"product_type" "device_type" NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hardware_orders_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "profile_links" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"type" "link_type" NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "profile_type" DEFAULT 'personal' NOT NULL,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"headline" text,
	"bio" text,
	"avatar_url" text,
	"phone" text,
	"email" text,
	"website" text,
	"location" text,
	"accent" text,
	"theme" "theme" DEFAULT 'ivory' NOT NULL,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upgrade_intents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"profile_id" text,
	"needs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "upgrade_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"locale" "locale" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_leads" ADD CONSTRAINT "contact_leads_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hardware_orders" ADD CONSTRAINT "hardware_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_links" ADD CONSTRAINT "profile_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_intents" ADD CONSTRAINT "upgrade_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_intents" ADD CONSTRAINT "upgrade_intents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_profile_time_idx" ON "activity_events" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_profile_idx" ON "contact_leads" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "destinations_token_idx" ON "destinations" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_code_idx" ON "devices" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "links_profile_idx" ON "profile_links" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_username_idx" ON "profiles" USING btree ("username");--> statement-breakpoint
CREATE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_type_idx" ON "profiles" USING btree ("type");
CREATE TYPE "public"."resume_data_source" AS ENUM('manual', 'extracted');--> statement-breakpoint
CREATE TYPE "public"."resume_extraction_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'resume_view';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'resume_share';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'resume_download';--> statement-breakpoint
ALTER TYPE "public"."commerce_event_type" ADD VALUE 'resume_contact_click';--> statement-breakpoint
CREATE TABLE "resume_certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"issuer" text,
	"issue_date" text,
	"expiration_date" text,
	"credential_id" text,
	"credential_url" text
);
--> statement-breakpoint
CREATE TABLE "resume_education" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"institution" text NOT NULL,
	"degree" text,
	"field_of_study" text,
	"location" text,
	"start_date" text,
	"end_date" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "resume_experience" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"company" text NOT NULL,
	"title" text NOT NULL,
	"location" text,
	"start_date" text,
	"end_date" text,
	"current" boolean DEFAULT false NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "resume_languages" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"language" text NOT NULL,
	"proficiency" text
);
--> statement-breakpoint
CREATE TABLE "resume_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"headline" text,
	"professional_summary" text,
	"data_source" "resume_data_source",
	"original_resume_media_id" text,
	"original_file_name" text,
	"extraction_provider" text,
	"extraction_model" text,
	"extraction_status" "resume_extraction_status",
	"extraction_error" text,
	"public_enabled" boolean DEFAULT false NOT NULL,
	"show_summary" boolean DEFAULT true NOT NULL,
	"show_experience" boolean DEFAULT true NOT NULL,
	"show_education" boolean DEFAULT true NOT NULL,
	"show_skills" boolean DEFAULT true NOT NULL,
	"show_certifications" boolean DEFAULT true NOT NULL,
	"show_languages" boolean DEFAULT true NOT NULL,
	"show_projects" boolean DEFAULT true NOT NULL,
	"show_email" boolean DEFAULT false NOT NULL,
	"show_phone" boolean DEFAULT false NOT NULL,
	"show_location" boolean DEFAULT true NOT NULL,
	"show_website" boolean DEFAULT true NOT NULL,
	"show_original_pdf" boolean DEFAULT false NOT NULL,
	"cta_label_en" text,
	"cta_label_es" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"description" text,
	"url" text,
	"start_date" text,
	"end_date" text
);
--> statement-breakpoint
CREATE TABLE "resume_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_enabled" boolean DEFAULT true NOT NULL,
	"manual_builder_enabled" boolean DEFAULT true NOT NULL,
	"upload_enabled" boolean DEFAULT true NOT NULL,
	"ai_extraction_enabled" boolean DEFAULT true NOT NULL,
	"public_page_enabled" boolean DEFAULT true NOT NULL,
	"pdf_download_enabled" boolean DEFAULT true NOT NULL,
	"required_entitlement" text,
	"max_upload_size_mb" integer DEFAULT 10 NOT NULL,
	"allowed_document_types" jsonb DEFAULT '["application/pdf"]'::jsonb NOT NULL,
	"cta_label_en" text DEFAULT 'View Resume' NOT NULL,
	"cta_label_es" text DEFAULT 'Ver currículum' NOT NULL,
	"section_title_en" text DEFAULT 'Professional' NOT NULL,
	"section_title_es" text DEFAULT 'Profesional' NOT NULL,
	"upsell_heading_en" text DEFAULT 'Build your professional resume' NOT NULL,
	"upsell_heading_es" text DEFAULT 'Crea tu currículum profesional' NOT NULL,
	"upsell_body_en" text DEFAULT 'Included with the SnapLink Networking Kit.' NOT NULL,
	"upsell_body_es" text DEFAULT 'Incluido con el Kit de Networking SnapLink.' NOT NULL,
	"upsell_cta_en" text DEFAULT 'Learn more' NOT NULL,
	"upsell_cta_es" text DEFAULT 'Más información' NOT NULL,
	"upsell_product_slug" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"resume_profile_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"name" text NOT NULL,
	"category" text
);
--> statement-breakpoint
ALTER TABLE "resume_certifications" ADD CONSTRAINT "resume_certifications_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_education" ADD CONSTRAINT "resume_education_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_experience" ADD CONSTRAINT "resume_experience_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_languages" ADD CONSTRAINT "resume_languages_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_profiles" ADD CONSTRAINT "resume_profiles_original_resume_media_id_media_id_fk" FOREIGN KEY ("original_resume_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_projects" ADD CONSTRAINT "resume_projects_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_skills" ADD CONSTRAINT "resume_skills_resume_profile_id_resume_profiles_id_fk" FOREIGN KEY ("resume_profile_id") REFERENCES "public"."resume_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resume_certifications_resume_idx" ON "resume_certifications" USING btree ("resume_profile_id");--> statement-breakpoint
CREATE INDEX "resume_education_resume_idx" ON "resume_education" USING btree ("resume_profile_id");--> statement-breakpoint
CREATE INDEX "resume_experience_resume_idx" ON "resume_experience" USING btree ("resume_profile_id");--> statement-breakpoint
CREATE INDEX "resume_languages_resume_idx" ON "resume_languages" USING btree ("resume_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "resume_profiles_profile_idx" ON "resume_profiles" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "resume_profiles_owner_idx" ON "resume_profiles" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "resume_projects_resume_idx" ON "resume_projects" USING btree ("resume_profile_id");--> statement-breakpoint
CREATE INDEX "resume_skills_resume_idx" ON "resume_skills" USING btree ("resume_profile_id");
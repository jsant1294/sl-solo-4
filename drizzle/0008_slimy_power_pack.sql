CREATE TABLE "snap_track_signups" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "snap_track_signups_email_idx" ON "snap_track_signups" USING btree ("email");
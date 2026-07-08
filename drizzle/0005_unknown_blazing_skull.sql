ALTER TABLE "users" ADD COLUMN "cuisine_prefs" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dietary_restrictions" text[] DEFAULT '{}' NOT NULL;

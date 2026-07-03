ALTER TABLE "meals" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "ingredients" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "time_minutes" integer;--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "difficulty" text;
CREATE TABLE "recipe_imports" (
	"id" serial PRIMARY KEY NOT NULL,
	"submitted_by" integer NOT NULL,
	"content_hash" text NOT NULL,
	"recipe" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"meal_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_imports" ADD CONSTRAINT "recipe_imports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_imports" ADD CONSTRAINT "recipe_imports_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_imports_content_hash_unique" ON "recipe_imports" USING btree ("content_hash");

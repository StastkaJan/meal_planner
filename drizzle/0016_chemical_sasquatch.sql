ALTER TABLE "recipe_imports" DROP CONSTRAINT "recipe_imports_submitted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe_imports" ADD CONSTRAINT "recipe_imports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
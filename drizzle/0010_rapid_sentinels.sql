CREATE TABLE "bonus_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"date" date NOT NULL,
	"name" text NOT NULL,
	"calories" integer,
	"protein_g" numeric(6, 1),
	"carbs_g" numeric(6, 1),
	"fat_g" numeric(6, 1)
);
--> statement-breakpoint
ALTER TABLE "bonus_items" ADD CONSTRAINT "bonus_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
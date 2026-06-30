CREATE TABLE "meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"calories" integer,
	"protein_g" numeric(6, 1),
	"carbs_g" numeric(6, 1),
	"fat_g" numeric(6, 1)
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'New Plan' NOT NULL,
	"week_start" date DEFAULT CURRENT_DATE NOT NULL,
	"cuisine_prefs" text[] DEFAULT '{}' NOT NULL,
	"dietary_restrictions" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "week_slots" (
	"plan_id" integer NOT NULL,
	"day_of_week" smallint NOT NULL,
	"meal_type" text NOT NULL,
	"meal_id" integer,
	CONSTRAINT "week_slots_plan_id_day_of_week_meal_type_pk" PRIMARY KEY("plan_id","day_of_week","meal_type")
);
--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;
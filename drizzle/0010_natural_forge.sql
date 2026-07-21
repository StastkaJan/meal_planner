CREATE TABLE "slot_repeats" (
	"plan_id" integer NOT NULL,
	"meal_type" text NOT NULL,
	"group_breaks" boolean[] NOT NULL,
	CONSTRAINT "slot_repeats_plan_id_meal_type_pk" PRIMARY KEY("plan_id","meal_type")
);
--> statement-breakpoint
ALTER TABLE "slot_repeats" ADD CONSTRAINT "slot_repeats_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
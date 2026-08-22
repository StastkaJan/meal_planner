CREATE TABLE "slot_leftovers" (
	"plan_id" integer NOT NULL,
	"date" date NOT NULL,
	"meal_type" text NOT NULL,
	"source_date" date NOT NULL,
	"source_meal_type" text NOT NULL,
	CONSTRAINT "slot_leftovers_plan_id_date_meal_type_pk" PRIMARY KEY("plan_id","date","meal_type")
);
--> statement-breakpoint
ALTER TABLE "slot_leftovers" ADD CONSTRAINT "slot_leftovers_plan_id_date_meal_type_week_slots_plan_id_date_meal_type_fk" FOREIGN KEY ("plan_id","date","meal_type") REFERENCES "public"."week_slots"("plan_id","date","meal_type") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slot_leftovers" ADD CONSTRAINT "slot_leftovers_plan_id_source_date_source_meal_type_week_slots_plan_id_date_meal_type_fk" FOREIGN KEY ("plan_id","source_date","source_meal_type") REFERENCES "public"."week_slots"("plan_id","date","meal_type") ON DELETE cascade ON UPDATE no action;
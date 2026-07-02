ALTER TABLE "week_slots" ADD COLUMN "week" date NOT NULL DEFAULT CURRENT_DATE;--> statement-breakpoint
ALTER TABLE "week_slots" DROP CONSTRAINT "week_slots_plan_id_day_of_week_meal_type_pk";--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_plan_id_week_day_of_week_meal_type_pk" PRIMARY KEY("plan_id","week","day_of_week","meal_type");--> statement-breakpoint
ALTER TABLE "week_slots" ALTER COLUMN "week" DROP DEFAULT;

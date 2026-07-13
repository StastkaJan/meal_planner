ALTER TABLE "week_slots" ADD COLUMN "date" date;--> statement-breakpoint
UPDATE "week_slots" SET "date" = ("week" + ("day_of_week" || ' days')::interval)::date;--> statement-breakpoint
ALTER TABLE "week_slots" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "week_slots" DROP CONSTRAINT "week_slots_plan_id_week_day_of_week_meal_type_pk";--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_plan_id_date_meal_type_pk" PRIMARY KEY("plan_id","date","meal_type");--> statement-breakpoint
ALTER TABLE "week_slots" DROP COLUMN "week";--> statement-breakpoint
ALTER TABLE "week_slots" DROP COLUMN "day_of_week";

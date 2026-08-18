ALTER TABLE "week_slots" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "week_slots" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_outcome_check" CHECK ("week_slots"."outcome" is null or "week_slots"."outcome" in ('cooked', 'skipped'));--> statement-breakpoint
ALTER TABLE "week_slots" ADD CONSTRAINT "week_slots_rating_check" CHECK ("week_slots"."rating" is null or ("week_slots"."rating" between 1 and 5 and "week_slots"."outcome" = 'cooked'));
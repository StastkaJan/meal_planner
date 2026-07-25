ALTER TABLE "meal_ingredients" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "meals" DROP COLUMN "ingredients";--> statement-breakpoint
ALTER TABLE "meal_ingredients" DROP COLUMN "raw";

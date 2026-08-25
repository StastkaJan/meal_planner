CREATE TABLE "meal_translations" (
	"meal_id" integer NOT NULL,
	"locale" text NOT NULL,
	"name" text,
	"description" text,
	"instructions" text,
	CONSTRAINT "meal_translations_meal_id_locale_pk" PRIMARY KEY("meal_id","locale")
);
--> statement-breakpoint
ALTER TABLE "meals" ADD COLUMN "source_locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "meal_translations" ADD CONSTRAINT "meal_translations_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;
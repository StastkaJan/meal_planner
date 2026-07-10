CREATE TABLE "user_settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"cuisine_prefs" text[] DEFAULT '{}' NOT NULL,
	"dietary_restrictions" text[] DEFAULT '{}' NOT NULL,
	"calorie_target" integer,
	"protein_target" integer,
	"carbs_target" integer,
	"fat_target" integer
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE TABLE "saved_extras" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"calories" integer,
	"protein_g" double precision,
	"carbs_g" double precision,
	"fat_g" double precision,
	"fiber_g" double precision,
	"sugar_g" double precision,
	"saturated_fat_g" double precision,
	"salt_g" double precision
);
--> statement-breakpoint
ALTER TABLE "saved_extras" ADD CONSTRAINT "saved_extras_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_extras_user_id_idx" ON "saved_extras" USING btree ("user_id");
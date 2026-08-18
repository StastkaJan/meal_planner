CREATE TABLE "shopping_items" (
	"plan_id" integer NOT NULL,
	"week" date NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"unit" text,
	"aisle" text DEFAULT 'Other' NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"custom" boolean DEFAULT false NOT NULL,
	CONSTRAINT "shopping_items_plan_id_week_key_pk" PRIMARY KEY("plan_id","week","key")
);
--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "pricing_interests" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"billing_interval" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pricing_interests" ADD CONSTRAINT "pricing_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
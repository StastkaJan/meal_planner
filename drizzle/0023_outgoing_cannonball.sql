CREATE TABLE "legal_document_events" (
	"user_id" integer NOT NULL,
	"document" text NOT NULL,
	"version" text NOT NULL,
	"action" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_document_events_user_id_document_version_pk" PRIMARY KEY("user_id","document","version")
);
--> statement-breakpoint
ALTER TABLE "legal_document_events" ADD CONSTRAINT "legal_document_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
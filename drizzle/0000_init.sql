CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"number" integer,
	"kind" text NOT NULL,
	"date_key" text,
	"topic_key" text,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"payload" jsonb NOT NULL,
	"sources" jsonb NOT NULL,
	"verification" jsonb NOT NULL,
	"generation" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"score" integer NOT NULL,
	"lives_left" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plays" ADD CONSTRAINT "plays_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cases_daily_date_key" ON "cases" USING btree ("date_key") WHERE "cases"."kind" = 'daily';--> statement-breakpoint
CREATE UNIQUE INDEX "cases_daily_number" ON "cases" USING btree ("number") WHERE "cases"."kind" = 'daily';--> statement-breakpoint
CREATE UNIQUE INDEX "cases_topic_key" ON "cases" USING btree ("topic_key") WHERE "cases"."kind" = 'topic';--> statement-breakpoint
CREATE INDEX "plays_case_id" ON "plays" USING btree ("case_id");
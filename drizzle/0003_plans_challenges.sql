CREATE TABLE "challenge_entries" (
	"challenge_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_entries_challenge_id_player_id_pk" PRIMARY KEY("challenge_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"case_id" uuid NOT NULL,
	"challenger_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "plan_period" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "plan_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "plan_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "plan_canceled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_entries" ADD CONSTRAINT "challenge_entries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenger_id_players_id_fk" FOREIGN KEY ("challenger_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "challenge_entries_player" ON "challenge_entries" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_challenger_case" ON "challenges" USING btree ("challenger_id","case_id");
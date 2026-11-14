ALTER TABLE "cases" ADD COLUMN "exhibits" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "narration" jsonb;
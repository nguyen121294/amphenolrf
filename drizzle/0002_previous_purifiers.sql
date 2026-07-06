CREATE TABLE "daily_production_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"supervisor" varchar(100) NOT NULL,
	"absentees" integer DEFAULT 0 NOT NULL,
	"overtime" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_production_summaries_date_unique" UNIQUE("date")
);
--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "daily_plan_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "training_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "stoppage_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "co_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "materials_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "quality_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "sop_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "fai_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "fqc_time" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD COLUMN "other_loss_time" double precision DEFAULT 0 NOT NULL;
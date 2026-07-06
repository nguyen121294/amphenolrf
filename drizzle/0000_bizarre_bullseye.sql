CREATE TABLE "assembly_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"line_id" integer NOT NULL,
	"mo" varchar(100) NOT NULL,
	"item_id" integer NOT NULL,
	"qty_mo" integer NOT NULL,
	"actual_qty" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"head_count" integer NOT NULL,
	"leader" varchar(100) NOT NULL,
	"note" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_description" varchar(255) NOT NULL,
	"uph" integer NOT NULL,
	"xa_time" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "items_item_description_unique" UNIQUE("item_description")
);
--> statement-breakpoint
CREATE TABLE "lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"line_name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lines_line_name_unique" UNIQUE("line_name")
);
--> statement-breakpoint
CREATE TABLE "packing_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"item_id" integer NOT NULL,
	"mo" varchar(100) NOT NULL,
	"qty_mo" integer NOT NULL,
	"packed_qty" integer NOT NULL,
	"leader" varchar(100) NOT NULL,
	"note" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD CONSTRAINT "assembly_reports_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_reports" ADD CONSTRAINT "assembly_reports_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packing_reports" ADD CONSTRAINT "packing_reports_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;
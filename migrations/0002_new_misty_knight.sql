CREATE TABLE "archive_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"archive_name" varchar(255) NOT NULL,
	"archive_path" varchar(500) NOT NULL,
	"age_threshold_days" integer NOT NULL,
	"records_archived" jsonb DEFAULT '{}' NOT NULL,
	"archive_size_bytes" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"deleted_from_db" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" varchar,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "charge_code_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"charge_code" varchar(50) NOT NULL,
	"assigned_by" varchar,
	"assigned_at" timestamp DEFAULT now(),
	"notes" text,
	CONSTRAINT "charge_code_assignments_user_id_charge_code_unique" UNIQUE("user_id","charge_code")
);
--> statement-breakpoint
CREATE TABLE "charge_code_authorized_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"charge_code" varchar NOT NULL,
	"user_name" varchar(200) NOT NULL,
	"email" varchar(200),
	"department" varchar(200),
	"notes" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "on_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "hold_reason" text;--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "held_at" timestamp;--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "held_by" varchar;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "vat_rate" numeric(5, 4) DEFAULT '0.2000' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "vat_amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_rate" numeric(5, 4) DEFAULT '0.2000';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "vat_included" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "update_inventory_values" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "vat_included" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_to" varchar(200);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_to_email" varchar(200);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "delivered_at" timestamp;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "account_number" varchar(25);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_picking_list" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "archive_jobs" ADD CONSTRAINT "archive_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "archive_jobs" ADD CONSTRAINT "archive_jobs_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_assignments" ADD CONSTRAINT "charge_code_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_assignments" ADD CONSTRAINT "charge_code_assignments_charge_code_chargecodes_code_fk" FOREIGN KEY ("charge_code") REFERENCES "public"."chargecodes"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_assignments" ADD CONSTRAINT "charge_code_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_authorized_users" ADD CONSTRAINT "charge_code_authorized_users_charge_code_chargecodes_code_fk" FOREIGN KEY ("charge_code") REFERENCES "public"."chargecodes"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_code_authorized_users" ADD CONSTRAINT "charge_code_authorized_users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_archive_jobs_status" ON "archive_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_archive_jobs_created_at" ON "archive_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_archive_jobs_deleted_from_db" ON "archive_jobs" USING btree ("deleted_from_db");--> statement-breakpoint
ALTER TABLE "chargecodes" ADD CONSTRAINT "chargecodes_held_by_users_id_fk" FOREIGN KEY ("held_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "items" ALTER COLUMN "current_stock" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "current_stock" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "minimum_stock" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "minimum_stock" SET DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "quote_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "sale_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "previous_stock" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "new_stock" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "activity" varchar(200);--> statement-breakpoint
ALTER TABLE "chargecodes" ADD COLUMN "cat3" varchar(200);--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "unit" varchar(50) DEFAULT 'pieces' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "location" varchar(200);--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "low_stock_acknowledged_at" timestamp;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "vendor_sku" varchar(100);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "received_quantity" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_charge" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_pdf_path" varchar(500);--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "quote_name" varchar(200);--> statement-breakpoint
CREATE INDEX "idx_items_name" ON "items" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_items_category" ON "items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_items_is_active" ON "items" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_items_updated_at" ON "items" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_items_active_category" ON "items" USING btree ("is_active","category_id");
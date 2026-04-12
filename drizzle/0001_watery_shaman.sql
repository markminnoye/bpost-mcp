CREATE TABLE "barcode_sequences" (
	"tenant_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"next_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "barcode_sequences_tenant_week_unique" UNIQUE("tenant_id","week")
);
--> statement-breakpoint
CREATE TABLE "tenant_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"barcode_strategy" text DEFAULT 'bpost-generates' NOT NULL,
	"barcode_length" text DEFAULT '7' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_preferences_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
ALTER TABLE "bpost_credentials" ADD COLUMN "barcode_customer_id" text;--> statement-breakpoint
ALTER TABLE "barcode_sequences" ADD CONSTRAINT "barcode_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_preferences" ADD CONSTRAINT "tenant_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
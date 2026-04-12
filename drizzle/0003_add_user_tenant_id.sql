-- Add tenant_id column to user table (was missing from initial migration)
ALTER TABLE "user" ADD COLUMN "tenant_id" uuid;
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;

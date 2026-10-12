ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "default_format" text DEFAULT 'Small' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "default_priority" text DEFAULT 'NP' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "default_gen_mid" text DEFAULT '7' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "default_presort" text DEFAULT 'N' NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "code_prefix" text;

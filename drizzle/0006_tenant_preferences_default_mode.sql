ALTER TABLE "tenant_preferences" ADD COLUMN IF NOT EXISTS "default_mode" text DEFAULT 'P' NOT NULL;

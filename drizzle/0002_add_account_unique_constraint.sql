-- Add unique index required by AuthJS DrizzleAdapter on (provider, providerAccountId)
-- This prevents OAuthAccountNotLinked errors when users try to sign in with OAuth
ALTER TABLE "account" ADD CONSTRAINT "account_provider_providerAccountId_unique" UNIQUE("provider", "providerAccountId");

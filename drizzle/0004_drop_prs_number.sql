-- prs_number duplicated customer_number: bpost Customer Id IS the PRS-ID.
ALTER TABLE "bpost_credentials" DROP COLUMN IF EXISTS "prs_number";

import { z } from 'zod'
import { parseAuthAcceptedIssuers } from '@/lib/oauth/accepted-issuers'
import { resolvePublicBaseUrlFromEnv } from '@/lib/config/resolve-public-base-url'

/**
 * Public site URL for env-backed helpers (dashboard copy, JWT fallback).
 * OAuth metadata and token signing use `getPublicOrigin(request)` so the same deployment
 * works on a custom domain even when this value is still the default deployment hostname.
 * For consistent install links and docs, set NEXT_PUBLIC_BASE_URL to your canonical URL
 * (production: https://bpost.sonicrocket.app).
 *
 * Access-token checks also allow `AUTH_ACCEPTED_ISSUERS` (default: the previous .io host).
 * New tokens are still signed for the request origin, which is the canonical host once
 * clients call that URL. Discovery `issuer` must stay equal to the URL the client fetched.
 */

/**
 * Centralized environment variable validation and access.
 * Use this instead of direct process.env access to ensure consistency
 * and prevent incorrect fallback URLs.
 */
const envSchema = z.object({
  /** The public-facing base URL of the service (e.g. https://bpost.sonicrocket.app) */
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_BASE_URL must be a valid URL. Set it in .env.local for dev, or rely on VERCEL_URL on Vercel, or set NEXT_PUBLIC_BASE_URL in the dashboard (recommended for production custom domains).' }),
  
  /** GitHub Token for reporting issues */
  GITHUB_TOKEN: z.string().optional(),

  /** TCP Redis URL for batch state (Vercel Marketplace Redis sets this automatically). */
  REDIS_URL: z.string().optional(),

  /** Timeout in ms for `/ready` dependency probes (DB/Redis). */
  READINESS_PROBE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1500),

  /**
   * Extra OAuth access-token issuers and audiences (comma-separated origins).
   * Unset keeps https://bpost.sonicrocket.io. Empty string accepts no extra hosts.
   */
  AUTH_ACCEPTED_ISSUERS: z.string().optional(),

  /** HS256 key for OAuth access tokens (must match runtime reads in `jwt.ts` for tests). */
  OAUTH_JWT_SECRET: z
    .string()
    .min(
      1,
      'OAUTH_JWT_SECRET is required for OAuth JWT signing. Set it in Vercel (Production) or .env.local. Generate: openssl rand -base64 32',
    ),

  // ── src/core/masspost — single-tenant bpost credentials (Contrapunt) ──────────
  // All optional here so the app still boots without them; `src/core/masspost/credentials.ts`
  // fails fast with a readable error only when the masspost library is actually used.

  /** bpost e-MassPost HTTP login (Basic Auth). */
  BPOST_TEST_USERNAME: z.string().optional(),
  /** bpost e-MassPost HTTP password (Basic Auth). */
  BPOST_TEST_PASSWORD: z.string().optional(),
  /** bpost customer id (PRS / sender / Header.customerId). Prefer this name over BPOST_TEST_CUSTOMER_NUMBER. */
  BPOST_TEST_CUSTOMER_ID: z.string().optional(),
  /** @deprecated Use BPOST_TEST_CUSTOMER_ID — still read as fallback in credentials.ts. */
  BPOST_TEST_CUSTOMER_NUMBER: z.string().optional(),
  /** bpost PBC account id (Header.accountId) — portal "Account Id", not Barcode Id. */
  BPOST_TEST_ACCOUNT_ID: z.string().optional(),
  /** Mail ID "Barcode Id" from portal, zero-padded to 5 digits (e.g. 210 → 00210). Not Header/@accountId. */
  BPOST_TEST_BARCODE_CUSTOMER_ID: z
    .string()
    .regex(/^\d{5}$/, 'BPOST_TEST_BARCODE_CUSTOMER_ID must be exactly 5 digits')
    .optional(),
  /** Mail ID file format version (VVVV). Contrapunt locked to 0200 (v2.00) on 28/09/2026 — live Status 100. Must match Context/@version and MID_ VVVV _… filename. See docs/internal/masspost-test-env.md */
  BPOST_TEST_MID_VERSION: z.enum(['0100', '0102', '0200']).default('0200'),
  /** Your per-file reference (NNNN… in bpost filename, max 10). Same value as Header/Files/RequestProps/@customerFileRef. See docs/internal/masspost-test-env.md */
  BPOST_TEST_CUSTOMER_FILE_REF: z.string().min(1).max(10).default('REFERENCE'),

  /** FTP(S) host for file transfer. Defaults to bpost's documented host. */
  BPOST_FTP_HOST: z.string().default('filetransfer.bpost.be'),
  /** FTP(S) username, if different from the HTTP login. */
  BPOST_FTP_USERNAME: z.string().optional(),
  /** FTP(S) password, if different from the HTTP login. */
  BPOST_FTP_PASSWORD: z.string().optional(),
  /** Use FTPS (explicit TLS) instead of plain FTP. bpost recommends this. */
  BPOST_FTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: resolvePublicBaseUrlFromEnv(),
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
  READINESS_PROBE_TIMEOUT_MS: process.env.READINESS_PROBE_TIMEOUT_MS,
  AUTH_ACCEPTED_ISSUERS: process.env.AUTH_ACCEPTED_ISSUERS,
  OAUTH_JWT_SECRET: process.env.OAUTH_JWT_SECRET,
  BPOST_TEST_USERNAME: process.env.BPOST_TEST_USERNAME,
  BPOST_TEST_PASSWORD: process.env.BPOST_TEST_PASSWORD,
  BPOST_TEST_CUSTOMER_ID: process.env.BPOST_TEST_CUSTOMER_ID,
  BPOST_TEST_CUSTOMER_NUMBER: process.env.BPOST_TEST_CUSTOMER_NUMBER,
  BPOST_TEST_ACCOUNT_ID: process.env.BPOST_TEST_ACCOUNT_ID,
  BPOST_TEST_BARCODE_CUSTOMER_ID: process.env.BPOST_TEST_BARCODE_CUSTOMER_ID,
  BPOST_TEST_MID_VERSION: process.env.BPOST_TEST_MID_VERSION,
  BPOST_TEST_CUSTOMER_FILE_REF: process.env.BPOST_TEST_CUSTOMER_FILE_REF,
  BPOST_FTP_HOST: process.env.BPOST_FTP_HOST,
  BPOST_FTP_USERNAME: process.env.BPOST_FTP_USERNAME,
  BPOST_FTP_PASSWORD: process.env.BPOST_FTP_PASSWORD,
  BPOST_FTP_SECURE: process.env.BPOST_FTP_SECURE,
})

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format())
  throw new Error('Invalid environment variables')
}

let acceptedIssuers: string[]
try {
  acceptedIssuers = parseAuthAcceptedIssuers(result.data.AUTH_ACCEPTED_ISSUERS)
} catch (error) {
  console.error('❌ Invalid environment variables:', error)
  throw new Error('Invalid environment variables')
}

export const env = {
  ...result.data,
  AUTH_ACCEPTED_ISSUERS: acceptedIssuers,
}

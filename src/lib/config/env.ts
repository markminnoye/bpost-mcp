import { z } from 'zod'

/**
 * Resolves the public site URL for env-backed helpers (dashboard copy, JWT fallback).
 * OAuth metadata and token signing use `getPublicOrigin(request)` so the same deployment
 * works on a custom domain even when this value is still the default deployment hostname.
 * For consistent install links and docs, set NEXT_PUBLIC_BASE_URL to your canonical URL.
 */
function resolveNextPublicBaseUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  // Local dev fallback (no Vercel env, no explicit var set)
  return 'http://localhost:3000'
}

/**
 * Centralized environment variable validation and access.
 * Use this instead of direct process.env access to ensure consistency
 * and prevent incorrect fallback URLs.
 */
const envSchema = z.object({
  /** The public-facing base URL of the service (e.g. https://bpost.sonicrocket.io) */
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_BASE_URL must be a valid URL. Set it in .env.local for dev, or rely on VERCEL_URL on Vercel, or set NEXT_PUBLIC_BASE_URL in the dashboard (recommended for production custom domains).' }),
  
  /** GitHub Token for reporting issues */
  GITHUB_TOKEN: z.string().optional(),

  /** TCP Redis URL for batch state (Vercel Marketplace Redis sets this automatically). */
  REDIS_URL: z.string().optional(),
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: resolveNextPublicBaseUrl(),
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
})

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format())
  throw new Error('Invalid environment variables')
}

export const env = result.data

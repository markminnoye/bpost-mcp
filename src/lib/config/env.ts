import { z } from 'zod'

/**
 * Centralized environment variable validation and access.
 * Use this instead of direct process.env access to ensure consistency
 * and prevent incorrect fallback URLs.
 */
const envSchema = z.object({
  /** The public-facing base URL of the service (e.g. https://bpost.sonicrocket.io) */
  NEXT_PUBLIC_BASE_URL: z
    .string()
    .url({ message: 'NEXT_PUBLIC_BASE_URL must be a valid URL. Set it in .env.local for dev or in the Vercel dashboard for deployments.' }),
  
  /** GitHub Token for reporting issues */
  GITHUB_TOKEN: z.string().optional(),

  /** TCP Redis URL for batch state (Vercel Marketplace Redis sets this automatically). */
  REDIS_URL: z.string().optional(),
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
})

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format())
  throw new Error('Invalid environment variables')
}

export const env = result.data

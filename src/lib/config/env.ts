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
    .url()
    .default('https://bpost.sonicrocket.io'),
  
  /** GitHub Token for reporting issues */
  GITHUB_TOKEN: z.string().optional(),
})

// Use safeParse to provide better error messages if validation fails
const result = envSchema.safeParse({
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
})

if (!result.success) {
  console.error('❌ Invalid environment variables:', result.error.format())
  throw new Error('Invalid environment variables')
}

export const env = result.data

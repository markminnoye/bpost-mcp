/**
 * Resolves the public site URL from `NEXT_PUBLIC_BASE_URL` or `VERCEL_URL`.
 * Must stay aligned with `env.ts` validation input (before Zod).
 */
export function resolvePublicBaseUrlFromEnv(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

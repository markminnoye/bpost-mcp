import fs from 'fs/promises'
import path from 'path'
import { env } from '@/lib/config/env'

/**
 * Placeholder in `docs/install/install-prompt.md`. Replaced with the deployment
 * base URL when the prompt is served (`GET /api/install/prompt`).
 */
const BASE_URL_PLACEHOLDER = '{{BASE_URL}}'

/** Older placeholder kept so previously published prompt text still rewrites. */
const LEGACY_PUBLIC_ORIGIN = 'https://bpost-mcp.vercel.app'

/**
 * Reads the install assistant prompt and rewrites canonical URLs to the
 * deployment's `NEXT_PUBLIC_BASE_URL` (no trailing slash).
 */
export async function getInstallPromptMarkdown(): Promise<string> {
  const filePath = path.join(process.cwd(), 'docs/install/install-prompt.md')
  const raw = await fs.readFile(filePath, 'utf8')
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  return raw.split(BASE_URL_PLACEHOLDER).join(base).split(LEGACY_PUBLIC_ORIGIN).join(base)
}

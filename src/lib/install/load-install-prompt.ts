import fs from 'fs/promises'
import path from 'path'
import { env } from '@/lib/config/env'

/** Legacy hostname embedded in `docs/install/install-prompt.md` before dynamic substitution. */
const LEGACY_PUBLIC_ORIGIN = 'https://bpost-mcp.vercel.app'

/**
 * Reads the install assistant prompt and rewrites canonical URLs to the
 * deployment's `NEXT_PUBLIC_BASE_URL` (no trailing slash).
 */
export async function getInstallPromptMarkdown(): Promise<string> {
  const filePath = path.join(process.cwd(), 'docs/install/install-prompt.md')
  const raw = await fs.readFile(filePath, 'utf8')
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  return raw.split(LEGACY_PUBLIC_ORIGIN).join(base)
}

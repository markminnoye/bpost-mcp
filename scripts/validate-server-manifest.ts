/**
 * Validates root `server.json` for MCP Registry: parseable JSON, required fields,
 * version parity with package.json, and streamable-http remote URL shape.
 */
import { readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'
import packageJson from '../package.json'

const manifestSchema = z.object({
  $schema: z.string().url(),
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  websiteUrl: z.string().url(),
  repository: z.object({
    url: z.string().url(),
    source: z.literal('github'),
  }),
  icons: z
    .array(
      z.object({
        src: z.string().url(),
        mimeType: z.string().min(1),
        sizes: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  remotes: z
    .array(
      z.object({
        type: z.literal('streamable-http'),
        url: z.string().url(),
        headers: z
          .array(
            z.object({
              name: z.string().min(1),
              description: z.string().optional(),
              isRequired: z.boolean().optional(),
              isSecret: z.boolean().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
})

function main(): void {
  const root = process.cwd()
  const file = path.join(root, 'server.json')
  let raw: string
  try {
    raw = readFileSync(file, 'utf8')
  } catch {
    throw new Error(`Missing or unreadable ${path.relative(root, file)}`)
  }
  const data = JSON.parse(raw) as unknown
  manifestSchema.parse(data)

  const manifest = data as z.infer<typeof manifestSchema>
  if (manifest.version !== packageJson.version) {
    throw new Error(
      `server.json version "${manifest.version}" must match package.json "${packageJson.version}"`,
    )
  }

  const mcpUrl = manifest.remotes[0].url.replace(/\/$/, '')
  if (!mcpUrl.endsWith('/api/mcp')) {
    throw new Error(`remotes[0].url must end with /api/mcp, got ${manifest.remotes[0].url}`)
  }

  console.log(`Validated ${path.relative(root, file)} (version=${manifest.version})`)
}

main()

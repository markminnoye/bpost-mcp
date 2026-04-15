/**
 * Writes root `server.json` for the MCP Registry (official schema) at build time.
 * Run via `prebuild` so version and URLs stay aligned with `package.json` and `app-version.ts`.
 */
import { writeFile } from 'fs/promises'
import path from 'path'
import {
  APP_VERSION,
  MCP_REGISTRY_CANONICAL_ORIGIN,
  MCP_REGISTRY_GITHUB_REPO_URL,
  MCP_SERVER_DESCRIPTION,
  MCP_SERVER_DISPLAY_NAME,
  MCP_SERVER_DISPLAY_TITLE,
  MCP_SERVER_ICON_PUBLIC_PATH,
} from '../src/lib/app-version'

const ROOT = process.cwd()
const OUTPUT = path.join(ROOT, 'server.json')

const SCHEMA = 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json'

/** Same discovery order as runtime, but avoids `localhost` in committed manifest when env is unset. */
function resolveManifestOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel}`.replace(/\/$/, '')
  return MCP_REGISTRY_CANONICAL_ORIGIN.replace(/\/$/, '')
}

async function main(): Promise<void> {
  const origin = resolveManifestOrigin()
  const registryName = `io.github.markminnoye/${MCP_SERVER_DISPLAY_NAME}`

  const manifest = {
    $schema: SCHEMA,
    name: registryName,
    title: MCP_SERVER_DISPLAY_TITLE,
    description: MCP_SERVER_DESCRIPTION,
    version: APP_VERSION,
    websiteUrl: origin,
    repository: {
      url: MCP_REGISTRY_GITHUB_REPO_URL,
      source: 'github',
    },
    icons: [
      {
        src: `${origin}${MCP_SERVER_ICON_PUBLIC_PATH}`,
        mimeType: 'image/svg+xml',
        sizes: ['any'],
      },
    ],
    remotes: [
      {
        type: 'streamable-http',
        url: `${origin}/api/mcp`,
        headers: [
          {
            name: 'Authorization',
            description:
              'OAuth 2.0 bearer access token (scope mcp:tools). Obtain via dashboard sign-in and OAuth at /.well-known/oauth-authorization-server.',
            isRequired: true,
            isSecret: true,
          },
        ],
      },
    ],
  }

  await writeFile(`${OUTPUT}`, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)} (origin=${origin}, version=${APP_VERSION})`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

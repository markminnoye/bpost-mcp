import { env } from '@/lib/config/env'

/** Canonical protected resource URL for this deployment’s MCP HTTP endpoint. */
export function mcpProtectedResourceUrl(): string {
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  return `${base}/api/mcp`
}

/**
 * Map OAuth `resource` values from clients/metadata to a single canonical form
 * for this app (origin and `/api/mcp` are treated as the same resource).
 */
export function normalizeOAuthResourceParam(resource: string | null | undefined): string | null {
  if (!resource) return null
  const base = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  const canonical = `${base}/api/mcp`
  const t = resource.replace(/\/$/, '')
  if (t === base || t === `${base}/api` || t === canonical) return canonical
  return t
}

/**
 * RFC 8707-style resource binding at the token endpoint. Accepts equivalent
 * origin vs `/api/mcp` forms; if the token request omits `resource` but the
 * auth code was bound to our canonical MCP URL, treat as a match (client interop).
 */
export function oauthResourcesMatchForToken(
  stored: string | null | undefined,
  fromTokenRequest: string | null | undefined,
): boolean {
  if (!stored) return true
  const ns = normalizeOAuthResourceParam(stored)
  const nt = normalizeOAuthResourceParam(fromTokenRequest ?? null)
  if (!nt) {
    return ns === mcpProtectedResourceUrl()
  }
  return ns === nt
}

import { env } from '@/lib/config/env'

/** Canonical MCP resource URL for a given public site origin (no trailing slash on base). */
export function mcpProtectedResourceUrlFromBase(publicBase: string): string {
  const base = publicBase.replace(/\/$/, '')
  return `${base}/api/mcp`
}

/** Canonical protected resource URL using configured env (dashboard / static copy). */
export function mcpProtectedResourceUrl(): string {
  return mcpProtectedResourceUrlFromBase(env.NEXT_PUBLIC_BASE_URL)
}

/**
 * Map OAuth `resource` values from clients/metadata to a single canonical form
 * for this app (origin and `/api/mcp` are treated as the same resource).
 */
export function normalizeOAuthResourceParamFromBase(
  publicBase: string,
  resource: string | null | undefined,
): string | null {
  if (!resource) return null
  const base = publicBase.replace(/\/$/, '')
  const canonical = `${base}/api/mcp`
  const t = resource.replace(/\/$/, '')
  if (t === base || t === `${base}/api` || t === canonical) return canonical
  return t
}

export function normalizeOAuthResourceParam(resource: string | null | undefined): string | null {
  return normalizeOAuthResourceParamFromBase(env.NEXT_PUBLIC_BASE_URL, resource)
}

/**
 * RFC 8707-style resource binding at the token endpoint. Accepts equivalent
 * origin vs `/api/mcp` forms; if the token request omits `resource` but the
 * auth code was bound to our canonical MCP URL, treat as a match (client interop).
 */
export function oauthResourcesMatchForTokenFromBase(
  publicBase: string,
  stored: string | null | undefined,
  fromTokenRequest: string | null | undefined,
): boolean {
  if (!stored) return true
  const ns = normalizeOAuthResourceParamFromBase(publicBase, stored)
  const nt = normalizeOAuthResourceParamFromBase(publicBase, fromTokenRequest ?? null)
  if (!nt) {
    return ns === mcpProtectedResourceUrlFromBase(publicBase)
  }
  return ns === nt
}

export function oauthResourcesMatchForToken(
  stored: string | null | undefined,
  fromTokenRequest: string | null | undefined,
): boolean {
  return oauthResourcesMatchForTokenFromBase(env.NEXT_PUBLIC_BASE_URL, stored, fromTokenRequest)
}

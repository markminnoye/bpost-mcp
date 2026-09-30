import { env } from '@/lib/config/env'
import { MCP_CANONICAL_PATH, MCP_LEGACY_PATH } from '@/lib/mcp/paths'

/** Canonical MCP resource URL for a given public site origin (no trailing slash on base). */
export function mcpProtectedResourceUrlFromBase(publicBase: string): string {
  const base = publicBase.replace(/\/$/, '')
  return `${base}${MCP_CANONICAL_PATH}`
}

/** Canonical protected resource URL using configured env (dashboard / static copy). */
export function mcpProtectedResourceUrl(): string {
  return mcpProtectedResourceUrlFromBase(env.NEXT_PUBLIC_BASE_URL)
}

/**
 * Map OAuth `resource` values from clients/metadata to a single canonical form
 * for this app. Origin, `/api`, legacy `/api/mcp`, and `/mcp` are the same resource.
 */
export function normalizeOAuthResourceParamFromBase(
  publicBase: string,
  resource: string | null | undefined,
): string | null {
  if (!resource) return null
  const base = publicBase.replace(/\/$/, '')
  const canonical = `${base}${MCP_CANONICAL_PATH}`
  const t = resource.replace(/\/$/, '')
  if (
    t === base ||
    t === `${base}/api` ||
    t === `${base}${MCP_LEGACY_PATH}` ||
    t === canonical
  ) {
    return canonical
  }
  return t
}

export function normalizeOAuthResourceParam(resource: string | null | undefined): string | null {
  return normalizeOAuthResourceParamFromBase(env.NEXT_PUBLIC_BASE_URL, resource)
}

/**
 * RFC 8707-style resource binding at the token endpoint. Accepts equivalent
 * origin, legacy `/api/mcp`, and canonical `/mcp` forms; if the token request
 * omits `resource` but the auth code was bound to our MCP URL, treat as a match.
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

/**
 * Authorization may run on the canonical Host (e.g. custom domain) while
 * `POST /oauth/token` uses another public URL (e.g. `*.vercel.app`). Resource
 * binding must still succeed when both map to the same app — try the incoming
 * request origin first, then {@link env.NEXT_PUBLIC_BASE_URL} (set the latter to
 * your canonical URL in Vercel Production).
 */
export function oauthResourceMatchesAuthCodeAtTokenEndpoint(
  tokenRequestBase: string,
  stored: string | null | undefined,
  fromTokenRequest: string | null | undefined,
): boolean {
  if (!stored) return true
  const req = tokenRequestBase.replace(/\/$/, '')
  const configured = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  const bases = req === configured ? [req] : [req, configured]
  return bases.some((b) => oauthResourcesMatchForTokenFromBase(b, stored, fromTokenRequest))
}

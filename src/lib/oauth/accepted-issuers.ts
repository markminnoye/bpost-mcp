/**
 * Extra JWT `iss` / `aud` origins accepted during the move from
 * `bpost.sonicrocket.io` to `bpost.sonicrocket.app`.
 *
 * Unset `AUTH_ACCEPTED_ISSUERS` keeps the default below. An empty value
 * disables the legacy allowlist. Remove the default once old tokens are gone.
 */
export const DEFAULT_LEGACY_ISSUER = 'https://bpost.sonicrocket.io'

export function parseAuthAcceptedIssuers(raw: string | undefined): string[] {
  if (raw === undefined) return [DEFAULT_LEGACY_ISSUER]

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  return [...new Set(parts.map((part) => normalizeIssuerOrigin(part)))]
}

/**
 * Origins whose access tokens verify: the request host, the configured base
 * URL, and the legacy allowlist. Signature checks stay in `jose`.
 */
export function buildIssuerAllowlist(
  requestOrigin: string,
  configuredBase: string,
  extraIssuers: readonly string[] | undefined,
): string[] {
  const extras = extraIssuers ?? [DEFAULT_LEGACY_ISSUER]
  const normalized = [requestOrigin, configuredBase, ...extras].map((value) => value.replace(/\/$/, ''))
  return [...new Set(normalized.filter((value) => value.length > 0))]
}

function normalizeIssuerOrigin(part: string): string {
  let url: URL
  try {
    url = new URL(part)
  } catch {
    throw new Error(`AUTH_ACCEPTED_ISSUERS contains an invalid URL: ${part}`)
  }
  if (url.username || url.password) {
    throw new Error(`AUTH_ACCEPTED_ISSUERS must not include credentials: ${part}`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`AUTH_ACCEPTED_ISSUERS must use http or https: ${part}`)
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new Error(`AUTH_ACCEPTED_ISSUERS entries must be origins without a path: ${part}`)
  }
  return url.origin
}

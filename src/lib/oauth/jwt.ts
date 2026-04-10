import * as jose from 'jose';
import { randomUUID } from 'crypto';
import { env } from '@/lib/config/env';

const ACCESS_TOKEN_TTL = 3600; // 1 hour

export type SignAccessTokenOptions = {
  issuerBaseUrl?: string
  expiresInOverride?: number
}

function getSecret(): Uint8Array {
  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) throw new Error('OAUTH_JWT_SECRET is not set');
  return new TextEncoder().encode(secret);
}

export interface AccessTokenPayload {
  sub: string;
  tid: string;
  scope: string;
  jti?: string;
  iss?: string;
  aud?: string;
}

function resolveIssuer(issuerBaseUrl?: string): string {
  return (issuerBaseUrl ?? env.NEXT_PUBLIC_BASE_URL).replace(/\/$/, '');
}

/**
 * @param expiresInOverrideOrOptions - Legacy: negative seconds for already-expired test tokens.
 *   Or pass `{ issuerBaseUrl, expiresInOverride }` (e.g. from `getPublicOrigin(request)`).
 */
export async function signAccessToken(
  payload: { sub: string; tid: string; scope: string },
  expiresInOverrideOrOptions?: number | SignAccessTokenOptions,
): Promise<string> {
  const secret = getSecret();
  let expiresInOverride: number | undefined;
  let issuerBaseUrl: string | undefined;
  if (typeof expiresInOverrideOrOptions === 'number') {
    expiresInOverride = expiresInOverrideOrOptions;
  } else if (expiresInOverrideOrOptions != null) {
    expiresInOverride = expiresInOverrideOrOptions.expiresInOverride;
    issuerBaseUrl = expiresInOverrideOrOptions.issuerBaseUrl;
  }
  const expiresIn = expiresInOverride ?? ACCESS_TOKEN_TTL;
  const iss = resolveIssuer(issuerBaseUrl);

  return new jose.SignJWT({
    tid: payload.tid,
    scope: payload.scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(iss)
    .setAudience(iss)
    .setExpirationTime(expiresInOverride !== undefined && expiresInOverride < 0
      ? Math.floor(Date.now() / 1000) + expiresInOverride
      : `${expiresIn}s`)
    .setJti(randomUUID())
    .sign(secret);
}

/** Verify HS256 access token. When `allowedIssuerBases` is omitted, uses env base only. */
export async function verifyAccessToken(
  token: string,
  allowedIssuerBases?: string[],
): Promise<AccessTokenPayload> {
  const secret = getSecret();
  const normalized = (allowedIssuerBases?.length
    ? allowedIssuerBases
    : [env.NEXT_PUBLIC_BASE_URL]
  ).map((b) => b.replace(/\/$/, ''));
  const unique = [...new Set(normalized)];
  const issuerOpt = unique.length === 1 ? unique[0]! : unique;

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: issuerOpt,
    audience: issuerOpt,
  });

  return {
    sub: payload.sub as string,
    tid: payload.tid as string,
    scope: payload.scope as string,
    jti: payload.jti as string,
    iss: payload.iss as string,
    aud: payload.aud as string,
  };
}

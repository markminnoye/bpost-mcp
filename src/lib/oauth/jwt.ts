import * as jose from 'jose';
import { randomUUID } from 'crypto';

const ISSUER = process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app';
const AUDIENCE = ISSUER;
const ACCESS_TOKEN_TTL = 3600; // 1 hour

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

export async function signAccessToken(
  payload: { sub: string; tid: string; scope: string },
  expiresInOverride?: number,
): Promise<string> {
  const secret = getSecret();
  const expiresIn = expiresInOverride ?? ACCESS_TOKEN_TTL;

  return new jose.SignJWT({
    tid: payload.tid,
    scope: payload.scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(expiresInOverride !== undefined && expiresInOverride < 0
      ? Math.floor(Date.now() / 1000) + expiresInOverride
      : `${expiresIn}s`)
    .setJti(randomUUID())
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const secret = getSecret();

  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
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

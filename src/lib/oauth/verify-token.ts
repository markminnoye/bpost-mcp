// Note: AuthInfo is imported directly from the MCP SDK.
// The ./* wildcard export in the SDK package.json maps this path correctly.
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { getPublicOrigin } from 'mcp-handler';
import { env } from '@/lib/config/env';
import { verifyAccessToken } from './jwt';
import { resolveTenant } from '@/lib/tenant/resolve';

function jwtAllowedIssuerBases(request: Request): string[] {
  const o = getPublicOrigin(request).replace(/\/$/, '');
  const e = env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  return o === e ? [o] : [...new Set([o, e])];
}

function isJwt(token: string): boolean {
  return token.split('.').length === 3;
}

function isBpostToken(token: string): boolean {
  return token.startsWith('bpost_');
}

export async function verifyToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  if (isJwt(bearerToken)) {
    return verifyJwt(bearerToken, _req);
  }

  if (isBpostToken(bearerToken)) {
    return verifyBpostToken(bearerToken);
  }

  return undefined;
}

async function verifyJwt(token: string, req: Request): Promise<AuthInfo | undefined> {
  try {
    const payload = await verifyAccessToken(token, jwtAllowedIssuerBases(req));
    return {
      token,
      clientId: 'oauth',
      scopes: payload.scope ? payload.scope.split(' ') : [],
      extra: {
        tenantId: payload.tid,
        userId: payload.sub,
      },
    };
  } catch {
    return undefined;
  }
}

async function verifyBpostToken(token: string): Promise<AuthInfo | undefined> {
  const tenant = await resolveTenant(token);
  if (!tenant) return undefined;

  return {
    token,
    clientId: 'api_token',
    scopes: ['mcp:tools'],
    extra: {
      tenantId: tenant.tenantId,
    },
  };
}

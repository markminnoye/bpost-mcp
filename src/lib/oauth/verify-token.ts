// Note: AuthInfo is imported directly from the MCP SDK.
// The ./* wildcard export in the SDK package.json maps this path correctly.
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { verifyAccessToken } from './jwt';
import { resolveTenant } from '@/lib/tenant/resolve';

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
    return verifyJwt(bearerToken);
  }

  if (isBpostToken(bearerToken)) {
    return verifyBpostToken(bearerToken);
  }

  return undefined;
}

async function verifyJwt(token: string): Promise<AuthInfo | undefined> {
  try {
    const payload = await verifyAccessToken(token);
    return {
      token,
      clientId: 'oauth',
      scopes: payload.scope ? payload.scope.split(' ') : [],
      extra: {
        tenantId: payload.tid,
        userId: payload.sub,
      },
    };
  } catch (e: unknown) {
    const joseCode =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: unknown }).code)
        : 'unknown'
    // #region agent log
    const pl = {
      sessionId: '42a829',
      location: 'verify-token.ts',
      message: 'jwt_verify_failed',
      data: { joseCode },
      timestamp: Date.now(),
      hypothesisId: 'H5',
      runId: 'post-fix',
    }
    console.error('[bpost-mcp-debug-42a829]', JSON.stringify(pl))
    fetch('http://127.0.0.1:7439/ingest/4fd9d91e-c9e2-4977-98c6-a184e4358266', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42a829' },
      body: JSON.stringify(pl),
    }).catch(() => {})
    // #endregion
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

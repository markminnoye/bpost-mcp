import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { oauthAuthorizationCodes, oauthRefreshTokens } from '@/lib/db/schema';
import { signAccessToken } from '@/lib/oauth/jwt';
import { verifyPkceS256 } from '@/lib/oauth/pkce';
import { hashToken } from '@/lib/crypto';

function errorResponse(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status });
}

async function handleAuthorizationCode(params: URLSearchParams) {
  const code = params.get('code');
  const redirectUri = params.get('redirect_uri');
  const clientId = params.get('client_id');
  const codeVerifier = params.get('code_verifier');
  const resource = params.get('resource');

  if (!code || !redirectUri || !clientId || !codeVerifier) {
    return errorResponse('invalid_request', 'Missing required parameters');
  }

  const codeHash = hashToken(code);

  const rows = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.code, codeHash))
    .limit(1);

  if (rows.length === 0) {
    return errorResponse('invalid_grant', 'Authorization code not found');
  }

  const authCode = rows[0];

  if (authCode.usedAt) {
    return errorResponse('invalid_grant', 'Authorization code already used');
  }
  if (new Date() > authCode.expiresAt) {
    return errorResponse('invalid_grant', 'Authorization code expired');
  }
  if (authCode.clientId !== clientId) {
    return errorResponse('invalid_grant', 'Client ID mismatch');
  }
  if (authCode.redirectUri !== redirectUri) {
    return errorResponse('invalid_grant', 'Redirect URI mismatch');
  }
  if (authCode.resource && authCode.resource !== resource) {
    return errorResponse('invalid_grant', 'Resource mismatch');
  }

  if (!verifyPkceS256(codeVerifier, authCode.codeChallenge)) {
    return errorResponse('invalid_grant', 'PKCE verification failed');
  }

  await db
    .update(oauthAuthorizationCodes)
    .set({ usedAt: new Date() })
    .where(eq(oauthAuthorizationCodes.id, authCode.id));

  const accessToken = await signAccessToken({
    sub: authCode.userId,
    tid: authCode.tenantId,
    scope: authCode.scope ?? 'mcp:tools',
  });

  const rawRefreshToken = `ref_${randomBytes(32).toString('hex')}`;
  const refreshHash = hashToken(rawRefreshToken);

  await db.insert(oauthRefreshTokens).values({
    tokenHash: refreshHash,
    clientId,
    userId: authCode.userId,
    tenantId: authCode.tenantId,
    scope: authCode.scope ?? 'mcp:tools',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: rawRefreshToken,
  });
}

async function handleRefreshToken(params: URLSearchParams) {
  const refreshToken = params.get('refresh_token');
  const clientId = params.get('client_id');

  if (!refreshToken || !clientId) {
    return errorResponse('invalid_request', 'Missing required parameters');
  }

  const tokenHash = hashToken(refreshToken);

  const rows = await db
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return errorResponse('invalid_grant', 'Refresh token not found or revoked');
  }

  const oldToken = rows[0];

  if (new Date() > oldToken.expiresAt) {
    return errorResponse('invalid_grant', 'Refresh token expired');
  }
  if (oldToken.clientId !== clientId) {
    return errorResponse('invalid_grant', 'Client ID mismatch');
  }

  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshTokens.id, oldToken.id));

  const newRawRefreshToken = `ref_${randomBytes(32).toString('hex')}`;
  const newRefreshHash = hashToken(newRawRefreshToken);

  await db.insert(oauthRefreshTokens).values({
    tokenHash: newRefreshHash,
    clientId,
    userId: oldToken.userId,
    tenantId: oldToken.tenantId,
    scope: oldToken.scope ?? 'mcp:tools',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });

  const accessToken = await signAccessToken({
    sub: oldToken.userId,
    tid: oldToken.tenantId,
    scope: oldToken.scope ?? 'mcp:tools',
  });

  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: newRawRefreshToken,
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  let params: URLSearchParams;

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    params = new URLSearchParams(text);
  } else {
    return errorResponse('invalid_request', 'Content-Type must be application/x-www-form-urlencoded');
  }

  const grantType = params.get('grant_type');

  switch (grantType) {
    case 'authorization_code':
      return handleAuthorizationCode(params);
    case 'refresh_token':
      return handleRefreshToken(params);
    default:
      return errorResponse('unsupported_grant_type', `Grant type '${grantType}' is not supported`);
  }
}

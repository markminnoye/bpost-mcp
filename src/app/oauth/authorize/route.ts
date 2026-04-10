import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { bpostCredentials, oauthAuthorizationCodes } from '@/lib/db/schema';
import { resolveClient } from '@/lib/oauth/client-resolver';
import { hashToken } from '@/lib/crypto';
import { env } from '@/lib/config/env';
import { normalizeOAuthResourceParam } from '@/lib/oauth/resource-url';

const SUPPORTED_SCOPES = ['mcp:tools'];
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const responseType = params.get('response_type');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method') || 'S256';
  const scope = params.get('scope') || 'mcp:tools';
  const state = params.get('state');
  const resource = params.get('resource');

  // 1. Basic validation
  if (responseType !== 'code') {
    return NextResponse.json(
      { error: 'unsupported_response_type', error_description: 'Only response_type=code is supported' },
      { status: 400 },
    );
  }

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'client_id and redirect_uri are required' },
      { status: 400 },
    );
  }

  // 2. Resolve client
  const client = await resolveClient(clientId);
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client', error_description: 'Unknown client_id' },
      { status: 400 },
    );
  }

  // 3. Validate redirect_uri
  if (!client.redirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri not registered for this client' },
      { status: 400 },
    );
  }

  // 4. Require PKCE
  if (!codeChallenge) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'code_challenge is required (PKCE)' },
      { status: 400 },
    );
  }
  if (codeChallengeMethod !== 'S256') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Only S256 code_challenge_method is supported' },
      { status: 400 },
    );
  }

  // 5. Validate scope
  const requestedScopes = scope.split(' ');
  if (!requestedScopes.every((s) => SUPPORTED_SCOPES.includes(s))) {
    return NextResponse.json(
      { error: 'invalid_scope', error_description: `Supported scopes: ${SUPPORTED_SCOPES.join(', ')}` },
      { status: 400 },
    );
  }

  // 6. Check Auth.js session
  const session = await auth();
  if (!session?.user?.id || !(session.user as Record<string, unknown>)?.tenantId) {
    // #region agent log
    const p = {
      sessionId: '42a829',
      location: 'oauth/authorize/route.ts',
      message: 'oauth_authorize_redirect_signin',
      data: { resourceParam: resource, clientIdPrefix: clientId?.slice(0, 12) },
      timestamp: Date.now(),
      hypothesisId: 'H4',
      runId: 'post-fix',
    }
    console.error('[bpost-mcp-debug-42a829]', JSON.stringify(p))
    fetch('http://127.0.0.1:7439/ingest/4fd9d91e-c9e2-4977-98c6-a184e4358266', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42a829' },
      body: JSON.stringify(p),
    }).catch(() => {})
    // #endregion
    // No session — redirect to Google login, preserve all params as callbackUrl
    const baseUrl = env.NEXT_PUBLIC_BASE_URL;
    const callbackUrl = `${baseUrl}/oauth/authorize?${params.toString()}`;
    const signInUrl = new URL('/api/auth/signin', baseUrl);
    signInUrl.searchParams.set('callbackUrl', callbackUrl);
    return NextResponse.redirect(signInUrl.toString(), 302);
  }

  const tenantId = (session.user as Record<string, unknown>).tenantId as string;

  // 7. Check BPost credentials exist
  const creds = await db
    .select()
    .from(bpostCredentials)
    .where(eq(bpostCredentials.tenantId, tenantId))
    .limit(1);

  if (creds.length === 0) {
    // #region agent log
    const p = {
      sessionId: '42a829',
      location: 'oauth/authorize/route.ts',
      message: 'oauth_authorize_redirect_dashboard_no_creds',
      data: { tenantIdPrefix: tenantId.slice(0, 8) },
      timestamp: Date.now(),
      hypothesisId: 'H4',
      runId: 'post-fix',
    }
    console.error('[bpost-mcp-debug-42a829]', JSON.stringify(p))
    fetch('http://127.0.0.1:7439/ingest/4fd9d91e-c9e2-4977-98c6-a184e4358266', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42a829' },
      body: JSON.stringify(p),
    }).catch(() => {})
    // #endregion
    const baseUrl = env.NEXT_PUBLIC_BASE_URL;
    const dashboardUrl = new URL('/dashboard', baseUrl);
    dashboardUrl.searchParams.set('setup', 'credentials');
    dashboardUrl.searchParams.set('returnTo', url.toString());
    return NextResponse.redirect(dashboardUrl.toString(), 302);
  }

  // 8. Generate authorization code
  const rawCode = randomBytes(32).toString('hex');
  const hashedCode = hashToken(rawCode);

  await db.insert(oauthAuthorizationCodes).values({
    code: hashedCode,
    clientId,
    userId: session.user.id,
    tenantId,
    redirectUri,
    scope,
    codeChallenge,
    codeChallengeMethod,
    resource: resource ? normalizeOAuthResourceParam(resource) : null,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  });

  // #region agent log
  const p2 = {
    sessionId: '42a829',
    location: 'oauth/authorize/route.ts',
    message: 'oauth_authorize_code_issued',
    data: { storedResource: resource || null, clientIdPrefix: clientId.slice(0, 12) },
    timestamp: Date.now(),
    hypothesisId: 'H1',
    runId: 'post-fix',
  }
  console.error('[bpost-mcp-debug-42a829]', JSON.stringify(p2))
  fetch('http://127.0.0.1:7439/ingest/4fd9d91e-c9e2-4977-98c6-a184e4358266', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '42a829' },
    body: JSON.stringify(p2),
  }).catch(() => {})
  // #endregion

  // 9. Redirect with code
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set('code', rawCode);
  if (state) redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl.toString(), 302);
}

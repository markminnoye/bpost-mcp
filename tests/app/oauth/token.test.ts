import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));
vi.mock('@/lib/oauth/jwt');
vi.mock('@/lib/oauth/pkce');

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE=';

describe('POST /oauth/token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('exchanges authorization code for tokens', async () => {
    const { verifyPkceS256 } = await import('@/lib/oauth/pkce');
    (verifyPkceS256 as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { signAccessToken } = await import('@/lib/oauth/jwt');
    (signAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue('eyJ.mock.jwt');

    const { db } = await import('@/lib/db/client');
    // Mock auth code lookup
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'code-id',
            code: 'hashed-code',
            clientId: 'mcp_test',
            userId: 'user_123',
            tenantId: 'tenant_456',
            redirectUri: 'https://example.com/callback',
            scope: 'mcp:tools',
            codeChallenge: 'test-challenge',
            codeChallengeMethod: 'S256',
            resource: 'https://bpost-mcp.vercel.app',
            expiresAt: new Date(Date.now() + 600000), // 10 min from now
            usedAt: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    // Mock update (mark code as used)
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db as any).update = mockUpdate;

    // Mock refresh token insert
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'raw-auth-code',
      redirect_uri: 'https://example.com/callback',
      client_id: 'mcp_test',
      code_verifier: 'test-verifier',
      resource: 'https://bpost-mcp.vercel.app',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.access_token).toBeDefined();
    expect(json.token_type).toBe('Bearer');
    expect(json.expires_in).toBe(3600);
    expect(json.refresh_token).toBeDefined();
  });

  it('exchanges refresh token for new tokens (rotation)', async () => {
    const { signAccessToken } = await import('@/lib/oauth/jwt');
    (signAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue('eyJ.new.jwt');

    const { db } = await import('@/lib/db/client');
    // Mock refresh token lookup
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'refresh-id',
            tokenHash: 'hashed-refresh',
            clientId: 'mcp_test',
            userId: 'user_123',
            tenantId: 'tenant_456',
            scope: 'mcp:tools',
            expiresAt: new Date(Date.now() + 86400000), // tomorrow
            revokedAt: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    // Mock update (revoke old) + insert (new refresh token)
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db as any).update = mockUpdate;

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: 'ref_old_token',
      client_id: 'mcp_test',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.access_token).toBeDefined();
    expect(json.refresh_token).toBeDefined();
    // Old token should have been revoked (update called)
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('exchanges code when token request omits resource but auth code used origin (interop)', async () => {
    const { verifyPkceS256 } = await import('@/lib/oauth/pkce');
    (verifyPkceS256 as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { signAccessToken } = await import('@/lib/oauth/jwt');
    (signAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue('eyJ.mock.jwt');

    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            id: 'code-id',
            code: 'hashed-code',
            clientId: 'mcp_test',
            userId: 'user_123',
            tenantId: 'tenant_456',
            redirectUri: 'https://example.com/callback',
            scope: 'mcp:tools',
            codeChallenge: 'test-challenge',
            codeChallengeMethod: 'S256',
            resource: 'http://localhost:3000/api/mcp',
            expiresAt: new Date(Date.now() + 600000),
            usedAt: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;
    (db as any).update = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
    (db as any).insert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'raw-auth-code',
      redirect_uri: 'https://example.com/callback',
      client_id: 'mcp_test',
      code_verifier: 'test-verifier',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('rejects invalid grant_type', async () => {
    const { POST } = await import('@/app/oauth/token/route');
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'mcp_test',
    });

    const request = new Request('http://localhost/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

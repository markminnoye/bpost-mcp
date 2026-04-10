import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockResolveClient, mockDbSelect, mockDbInsert } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockResolveClient: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));
vi.mock('@/lib/db/client', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    insert: (...args: unknown[]) => mockDbInsert(...args),
  },
}));
vi.mock('@/lib/oauth/client-resolver', () => ({
  resolveClient: mockResolveClient,
}));

import { GET } from '@/app/oauth/authorize/route';

describe('GET /oauth/authorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to Google login when no session exists', async () => {
    mockAuth.mockResolvedValue(null);

    mockResolveClient.mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    const url = new URL('http://localhost:3000/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', 'random-state');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/api/auth/signin');
  });

  it('generates auth code and redirects when session + credentials exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user_123', tenantId: 'tenant_456' },
    });

    mockResolveClient.mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    // Mock BPost credentials exist
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 'cred_1' }]),
        }),
      }),
    });

    // Mock auth code insert
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const url = new URL('http://localhost:3000/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', 'random-state');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location')!;
    expect(location).toContain('https://example.com/callback');
    expect(location).toContain('code=');
    expect(location).toContain('state=random-state');
  });

  it('rejects request with missing code_challenge', async () => {
    mockResolveClient.mockResolvedValue({
      clientId: 'mcp_test',
      redirectUris: ['https://example.com/callback'],
      grantTypes: ['authorization_code'],
      responseTypes: ['code'],
      source: 'database',
    });

    const url = new URL('http://localhost:3000/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'mcp_test');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    // No code_challenge

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(400);
  });

  it('rejects unknown client_id', async () => {
    mockResolveClient.mockResolvedValue(null);

    const url = new URL('http://localhost:3000/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', 'unknown');
    url.searchParams.set('redirect_uri', 'https://example.com/callback');
    url.searchParams.set('code_challenge', 'test-challenge');
    url.searchParams.set('code_challenge_method', 'S256');

    const request = new Request(url.toString());
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});

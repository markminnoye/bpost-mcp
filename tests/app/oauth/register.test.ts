import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: vi.fn(),
  },
}));

describe('POST /oauth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('registers a new client and returns credentials', async () => {
    const { db } = await import('@/lib/db/client');
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    (db as any).insert = mockInsert;

    const { POST } = await import('@/app/oauth/register/route');
    const request = new Request('http://localhost/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Test Client',
        redirect_uris: ['https://example.com/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.client_id).toBeDefined();
    expect(body.client_name).toBe('Test Client');
    expect(body.redirect_uris).toContain('https://example.com/callback');
  });

  it('rejects request without redirect_uris', async () => {
    const { POST } = await import('@/app/oauth/register/route');
    const request = new Request('http://localhost/oauth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'No Redirects' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

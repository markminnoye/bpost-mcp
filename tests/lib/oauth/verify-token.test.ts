import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyToken } from '@/lib/oauth/verify-token';

vi.mock('@/lib/oauth/jwt');
vi.mock('@/lib/tenant/resolve');
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE=';

describe('verifyToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('verifies a valid JWT and returns AuthInfo', async () => {
    const { verifyAccessToken } = await import('@/lib/oauth/jwt');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: 'user_123',
      tid: 'tenant_456',
      scope: 'mcp:tools',
      jti: 'tok_abc',
    });

    const result = await verifyToken(new Request('http://localhost'), 'eyJ.header.signature');
    expect(result).toBeDefined();
    expect(result!.extra?.tenantId).toBe('tenant_456');
    expect(result!.extra?.userId).toBe('user_123');
    expect(result!.scopes).toContain('mcp:tools');
  });

  it('verifies a valid bpost_* token via resolveTenant', async () => {
    const { resolveTenant } = await import('@/lib/tenant/resolve');
    (resolveTenant as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenantId: 'tenant_789',
      bpostUsername: 'user',
      bpostPassword: 'pass',
      customerNumber: '123',
      accountId: '456',
    });

    const result = await verifyToken(new Request('http://localhost'), 'bpost_abc123def456');
    expect(result).toBeDefined();
    expect(result!.extra?.tenantId).toBe('tenant_789');
  });

  it('returns undefined for invalid JWT', async () => {
    const { verifyAccessToken } = await import('@/lib/oauth/jwt');
    (verifyAccessToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('invalid'));

    const result = await verifyToken(new Request('http://localhost'), 'eyJ.bad.token');
    expect(result).toBeUndefined();
  });

  it('returns undefined for unknown bpost_* token', async () => {
    const { resolveTenant } = await import('@/lib/tenant/resolve');
    (resolveTenant as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await verifyToken(new Request('http://localhost'), 'bpost_unknown');
    expect(result).toBeUndefined();
  });

  it('returns undefined when no token provided', async () => {
    const result = await verifyToken(new Request('http://localhost'), undefined);
    expect(result).toBeUndefined();
  });
});

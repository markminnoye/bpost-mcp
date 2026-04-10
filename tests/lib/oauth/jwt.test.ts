import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signAccessToken, verifyAccessToken } from '@/lib/oauth/jwt';

const TEST_SECRET = 'dGVzdC1zZWNyZXQtdGhhdC1pcy0zMi1ieXRlcyE='; // base64, 32 bytes

describe('JWT helpers', () => {
  beforeEach(() => {
    vi.stubEnv('OAUTH_JWT_SECRET', TEST_SECRET);
  });

  it('signs and verifies a valid access token', async () => {
    const payload = {
      sub: 'user_123',
      tid: 'tenant_456',
      scope: 'mcp:tools',
    };

    const token = await signAccessToken(payload);
    expect(token).toContain('.'); // JWT format

    const verified = await verifyAccessToken(token);
    expect(verified.sub).toBe('user_123');
    expect(verified.tid).toBe('tenant_456');
    expect(verified.scope).toBe('mcp:tools');
    expect(verified.jti).toBeDefined();
    expect(verified.iss).toBeDefined();
    expect(verified.aud).toBeDefined();
  });

  it('rejects an expired token', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload, -60); // expired 60s ago

    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it('rejects a token signed with wrong secret', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload);

    vi.stubEnv('OAUTH_JWT_SECRET', 'd3Jvbmctc2VjcmV0LXRoYXQtaXMtMzItYnl0ZXMh');
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it('verifies when issuer matches one of several allowed bases (custom domain + env)', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload, { issuerBaseUrl: 'https://custom.example' });

    const verified = await verifyAccessToken(token, [
      'https://custom.example',
      'https://deployment.vercel.app',
    ]);
    expect(verified.sub).toBe('user_123');
  });

  it('rejects when issuer is not in allowed list', async () => {
    const payload = { sub: 'user_123', tid: 'tenant_456', scope: 'mcp:tools' };
    const token = await signAccessToken(payload, { issuerBaseUrl: 'https://custom.example' });

    await expect(
      verifyAccessToken(token, ['https://other.only']),
    ).rejects.toThrow();
  });
});

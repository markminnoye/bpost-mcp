import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));
vi.mock('@/lib/crypto');

describe('getCredentialsByTenantId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('ENCRYPTION_KEY', 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcyE=');
  });

  it('returns decrypted credentials for valid tenantId', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            username: 'bpost_user',
            passwordEncrypted: 'encrypted_pw',
            passwordIv: 'iv_value',
            customerNumber: '12345678',
            accountId: '87654321',
            prsNumber: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const { decrypt } = await import('@/lib/crypto');
    (decrypt as ReturnType<typeof vi.fn>).mockReturnValue('decrypted_password');

    const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
    const result = await getCredentialsByTenantId('tenant_123');
    expect(result).not.toBeNull();
    expect(result!.bpostUsername).toBe('bpost_user');
    expect(result!.bpostPassword).toBe('decrypted_password');
    expect(result!.customerNumber).toBe('12345678');
  });

  it('returns null for tenantId with no credentials', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
    const result = await getCredentialsByTenantId('tenant_no_creds');
    expect(result).toBeNull();
  });

  it('returns barcodeCustomerId when present', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            username: 'bpost_user',
            passwordEncrypted: 'encrypted_pw',
            passwordIv: 'iv_value',
            customerNumber: '12345678',
            accountId: '87654321',
            prsNumber: null,
            barcodeCustomerId: '04521',
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const { decrypt } = await import('@/lib/crypto');
    (decrypt as ReturnType<typeof vi.fn>).mockReturnValue('decrypted_password');

    const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
    const result = await getCredentialsByTenantId('tenant_with_barcode');
    expect(result).not.toBeNull();
    expect(result!.barcodeCustomerId).toBe('04521');
  });

  it('returns undefined barcodeCustomerId when not set', async () => {
    const { db } = await import('@/lib/db/client');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            username: 'bpost_user',
            passwordEncrypted: 'encrypted_pw',
            passwordIv: 'iv_value',
            customerNumber: '12345678',
            accountId: '87654321',
            prsNumber: null,
            barcodeCustomerId: null,
          }]),
        }),
      }),
    });
    (db as any).select = mockSelect;

    const { decrypt } = await import('@/lib/crypto');
    (decrypt as ReturnType<typeof vi.fn>).mockReturnValue('decrypted_password');

    const { getCredentialsByTenantId } = await import('@/lib/tenant/get-credentials');
    const result = await getCredentialsByTenantId('tenant_no_barcode');
    expect(result).not.toBeNull();
    expect(result!.barcodeCustomerId).toBeUndefined();
  });
});

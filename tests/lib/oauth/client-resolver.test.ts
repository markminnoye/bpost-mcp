import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module before importing client-resolver
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { resolveClient } from '@/lib/oauth/client-resolver';
import { db } from '@/lib/db/client';

describe('resolveClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('resolves a URL-format client_id by fetching metadata document', async () => {
    const metadataUrl = 'https://example.com/.well-known/oauth-client';
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        client_id: metadataUrl,
        client_name: 'Test Client',
        redirect_uris: ['https://example.com/callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });

    const result = await resolveClient(metadataUrl);
    expect(result).not.toBeNull();
    expect(result!.clientId).toBe(metadataUrl);
    expect(result!.redirectUris).toContain('https://example.com/callback');
    expect(result!.source).toBe('metadata_document');
  });

  it('resolves a string-format client_id from DB', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{
            clientId: 'mcp_abc123',
            clientName: 'Claude Desktop',
            redirectUris: ['https://claude.ai/callback'],
            grantTypes: ['authorization_code', 'refresh_token'],
            responseTypes: ['code'],
          }]),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const result = await resolveClient('mcp_abc123');
    expect(result).not.toBeNull();
    expect(result!.clientId).toBe('mcp_abc123');
    expect(result!.source).toBe('database');
  });

  it('returns null for unknown string-format client_id', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    vi.mocked(db.select).mockImplementation(mockSelect);

    const result = await resolveClient('mcp_nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when URL metadata fetch fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const result = await resolveClient('https://bad-url.example.com');
    expect(result).toBeNull();
  });
});

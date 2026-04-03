// tests/client/bpost.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BpostClient, createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const validDepositXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DepositRequest><Context requestName="DepositRequest" dataset="M004_MPA" sender="12345678" receiver="EMP" version="0100"/></DepositRequest>`

describe('BpostClient', () => {
  let client: BpostClient

  beforeEach(() => {
    client = new BpostClient({
      username: 'testuser',
      password: 'testpass',
    })
    vi.clearAllMocks()
  })

  it('sends XML to BPost endpoint and returns parsed response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '<DepositResponse><Result code="OK"/></DepositResponse>',
    })

    const result = await client.sendDepositRequest(validDepositXml)
    expect(result).toHaveProperty('DepositResponse')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('bpost.be'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('throws BpostError on HTTP error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '<Error code="MPW-4010">Invalid sender</Error>',
    })

    await expect(client.sendDepositRequest(validDepositXml))
      .rejects.toBeInstanceOf(BpostError)
  })

  it('throws retryable BpostError on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('fetch failed'))

    const err = await client.sendDepositRequest(validDepositXml).catch(e => e)
    expect(err).toBeInstanceOf(BpostError)
    expect(err.isRetryable).toBe(true)
  })
})

describe('createBpostClient', () => {
  it('creates a BpostClient from explicit credentials', () => {
    const client = createBpostClient({ username: 'user', password: 'pass' })
    expect(client).toBeInstanceOf(BpostClient)
  })

  it('does not read from process.env', () => {
    // Should not throw even when env vars are absent
    delete process.env.BPOST_USERNAME
    delete process.env.BPOST_PASSWORD
    expect(() => createBpostClient({ username: 'u', password: 'p' })).not.toThrow()
  })
})

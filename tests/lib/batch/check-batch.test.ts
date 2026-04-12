import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BatchRow } from '@/lib/kv/client'

// Mock BpostClient before importing
vi.mock('@/client/bpost', () => ({
  createBpostClient: vi.fn(),
}))

vi.mock('@/lib/xml', () => ({
  buildXml: vi.fn((obj: Record<string, unknown>) => `<mock-xml>${JSON.stringify(obj)}</mock-xml>`),
}))

import { checkBatch, type CheckBatchParams } from '@/lib/batch/check-batch'
import { createBpostClient } from '@/client/bpost'
import { buildXml } from '@/lib/xml'
import { BpostError } from '@/client/errors'

const MOCK_CREDENTIALS = {
  username: 'testuser',
  password: 'testpass',
  customerNumber: '12345',
  accountId: '67890',
}

const MOCK_PARAMS: CheckBatchParams = {
  mailingRef: 'CHK-20260412-1430',
  mode: 'T',
  customerFileRef: 'BATCH001',
  copyRequestItem: 'N',
  suggestionsCount: 5,
  suggestionsMinScore: 60,
  pdpInResponse: 'N',
  allRecordInResponse: 'Y',
}

function makeRow(index: number, mapped: Record<string, unknown>): BatchRow {
  return {
    index,
    raw: {},
    mapped,
    validationErrors: undefined,
  }
}

describe('checkBatch', () => {
  let mockSendMailingRequest: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMailingRequest = vi.fn().mockResolvedValue({
      MailingResponse: {
        Context: { requestName: 'MailingResponse', dataset: 'M037_MID', sender: 'MID', receiver: 12345, version: '0100' },
        Header: { customerId: 12345 },
        MailingCheck: [{
          Status: { code: 'OK' },
          Replies: {
            Reply: [
              { seq: 1, Status: { code: 'OK' } },
              { seq: 2, Status: { code: 'OK' } },
            ],
          },
        }],
      },
    })
    vi.mocked(createBpostClient).mockReturnValue({
      sendMailingRequest: mockSendMailingRequest,
    } as never)
  })

  it('builds a valid MailingRequest XML with MailingCheck action', async () => {
    const rows: BatchRow[] = [
      makeRow(1, {
        seq: 1,
        priority: 'P',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
      makeRow(2, {
        seq: 2,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Martin' }] },
      }),
    ]

    const result = await checkBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(true)
    expect(result.checkedCount).toBe(2)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const req = xmlArg.MailingRequest

    expect(req.Context).toEqual({
      requestName: 'MailingRequest',
      dataset: 'M037_MID',
      sender: 12345,
      receiver: 'MID',
      version: '0200',
    })

    const check = (req.MailingCheck as Record<string, unknown>[])[0]
    expect(check.seq).toBe(1)
    expect(check.mailingRef).toBe('CHK-20260412-1430')
  })

  it('hardcodes genMID and genPSC to N regardless of params', async () => {
    const rows = [makeRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Dupont' }] } })]

    await checkBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const check = (xmlArg.MailingRequest.MailingCheck as Record<string, unknown>[])[0]
    expect(check.genMID).toBe('N')
    expect(check.genPSC).toBe('N')
  })

  it('sends all rows including those with validation errors', async () => {
    const rows: BatchRow[] = [
      makeRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Dupont' }] } }),
      makeRow(2, { seq: 2, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Martin' }] } }),
    ]
    rows[1].validationErrors = [{ code: 'invalid', message: 'test error' }] as never

    await checkBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const check = (xmlArg.MailingRequest.MailingCheck as Record<string, unknown>[])[0]
    expect((check.ItemCount as { value: number }).value).toBe(2)
  })

  it('auto-generates CHK- prefix when mailingRef omitted', async () => {
    const rows = [makeRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Dupont' }] } })]
    const paramsWithoutRef = { ...MOCK_PARAMS, mailingRef: 'CHK-2026' }

    await checkBatch(rows, paramsWithoutRef, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const check = (xmlArg.MailingRequest.MailingCheck as Record<string, unknown>[])[0]
    expect(String(check.mailingRef)).toMatch(/^CHK-/)
  })

  it('returns error result on BpostError', async () => {
    mockSendMailingRequest.mockRejectedValue(
      new BpostError('MID-3080', 'MailingCheck cannot be combined with other actions', false),
    )

    const rows = [makeRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Dupont' }] } })]

    const result = await checkBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(false)
    expect(result.error).toEqual({
      code: 'MID-3080',
      message: 'MailingCheck cannot be combined with other actions',
      retryable: false,
    })
  })

  it('throws when rows array is empty', async () => {
    await expect(checkBatch([], MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow('No rows to check')
  })

  it('throws on unexpected (non-BPost) errors', async () => {
    mockSendMailingRequest.mockRejectedValue(new Error('Network timeout'))

    const rows = [makeRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Dupont' }] } })]

    await expect(checkBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow('Network timeout')
  })
})
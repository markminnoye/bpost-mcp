import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BatchRow } from '@/lib/kv/client'

// Mock BpostClient before importing
vi.mock('@/client/bpost', () => ({
  createBpostClient: vi.fn(),
}))

vi.mock('@/lib/xml', () => ({
  buildXml: vi.fn((obj: Record<string, unknown>) => `<mock-xml>${JSON.stringify(obj)}</mock-xml>`),
}))

import { submitBatch, type SubmitBatchParams } from '@/lib/batch/submit-batch'
import { createBpostClient } from '@/client/bpost'
import { buildXml } from '@/lib/xml'
import { BpostError } from '@/client/errors'

const MOCK_CREDENTIALS = {
  username: 'testuser',
  password: 'testpass',
  customerNumber: '12345',
  accountId: '67890',
}

const MOCK_PARAMS: SubmitBatchParams = {
  mailingRef: 'B-20260412-1430',
  expectedDeliveryDate: '2026-04-15',
  format: 'Small',
  priority: 'NP',
  mode: 'T',
  customerFileRef: 'BATCH001',
  genMID: '7',
  genPSC: 'N',
}

function makeReadyRow(index: number, mapped: Record<string, unknown>): BatchRow {
  return {
    index,
    raw: {},
    mapped,
    validationErrors: undefined,
  }
}

describe('submitBatch', () => {
  let mockSendMailingRequest: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMailingRequest = vi.fn().mockResolvedValue({
      MailingResponse: {
        MailingCreate: [{ Status: { code: 'OK' } }],
      },
    })
    vi.mocked(createBpostClient).mockReturnValue({
      sendMailingRequest: mockSendMailingRequest,
    } as never)
  })

  it('builds a valid MailingRequest XML and sends it', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'P',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
      makeReadyRow(2, {
        seq: 2,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Martin' }] },
      }),
    ]

    const result = await submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(true)
    expect(result.mailingRef).toBe('B-20260412-1430')
    expect(result.submittedCount).toBe(2)

    // Verify buildXml was called with correct structure
    expect(buildXml).toHaveBeenCalledOnce()
    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const req = xmlArg.MailingRequest

    expect(req.Context).toEqual({
      requestName: 'MailingRequest',
      dataset: 'M037_MID',
      sender: 12345,
      receiver: 'MID',
      version: '0200',
    })

    expect(req.Header).toEqual({
      customerId: 12345,
      accountId: 67890,
      mode: 'T',
      Files: { RequestProps: { customerFileRef: 'BATCH001' } },
    })

    const mailing = (req.MailingCreate as Record<string, unknown>[])[0]
    expect(mailing.seq).toBe(1)
    expect(mailing.mailingRef).toBe('B-20260412-1430')
    expect(mailing.expectedDeliveryDate).toBe('2026-04-15')
    expect(mailing.genMID).toBe('7')
    expect(mailing.genPSC).toBe('N')
    expect(mailing.FileInfo).toEqual({ type: 'MID2' })
    expect(mailing.Format).toEqual({ value: 'Small' })
    expect((mailing.ItemCount as { value: number }).value).toBe(2)

    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items).toHaveLength(2)
    expect(items[0].priority).toBe('P')
    expect(items[1].priority).toBe('NP')
  })

  it('applies priority fallback to rows without priority', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        // no priority — should get fallback from params
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await submitBatch(rows, { ...MOCK_PARAMS, priority: 'P' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items[0].priority).toBe('P')
  })

  it('does not override row-level priority with params fallback', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'P', // row has its own priority
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    // Param says NP, but row says P — row wins
    await submitBatch(rows, { ...MOCK_PARAMS, priority: 'NP' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    const items = (mailing.Items as { Item: Record<string, unknown>[] }).Item
    expect(items[0].priority).toBe('P')
  })

  it('converts customerNumber and accountId to numbers', async () => {
    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await submitBatch(rows, MOCK_PARAMS, {
      ...MOCK_CREDENTIALS,
      customerNumber: '00999',
      accountId: '00123',
    })

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const req = xmlArg.MailingRequest
    expect((req.Context as Record<string, unknown>).sender).toBe(999)
    expect((req.Header as Record<string, unknown>).customerId).toBe(999)
    expect((req.Header as Record<string, unknown>).accountId).toBe(123)
  })

  it('returns error result on BpostError', async () => {
    mockSendMailingRequest.mockRejectedValue(
      new BpostError('MID-4010', 'Address line too long', false),
    )

    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    const result = await submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(false)
    expect(result.error).toEqual({
      code: 'MID-4010',
      message: 'Address line too long',
      retryable: false,
    })
  })

  it('throws on unexpected (non-BPost) errors', async () => {
    mockSendMailingRequest.mockRejectedValue(new Error('Network timeout'))

    const rows: BatchRow[] = [
      makeReadyRow(1, {
        seq: 1,
        priority: 'NP',
        Comps: { Comp: [{ code: '1', value: 'Dupont' }] },
      }),
    ]

    await expect(submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow('Network timeout')
  })

  it('throws when rows array is empty', async () => {
    await expect(submitBatch([], MOCK_PARAMS, MOCK_CREDENTIALS)).rejects.toThrow('No rows to submit')
  })

  it('builds Large format XML correctly', async () => {
    const rows = [makeReadyRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Test' }] } })]

    await submitBatch(rows, { ...MOCK_PARAMS, format: 'Large' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    expect(mailing.Format).toEqual({ value: 'Large' })
  })

  it('builds P priority XML correctly', async () => {
    const rows = [makeReadyRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Test' }] } })]

    await submitBatch(rows, { ...MOCK_PARAMS, priority: 'P' }, MOCK_CREDENTIALS)

    const xmlArg = vi.mocked(buildXml).mock.calls[0][0] as Record<string, Record<string, unknown>>
    const mailing = (xmlArg.MailingRequest.MailingCreate as Record<string, unknown>[])[0]
    expect(mailing.genMID).toBe('7')
    expect(mailing.genPSC).toBe('N')
  })

  it('returns retryable=true on retryable BPost error', async () => {
    mockSendMailingRequest.mockRejectedValue(
      new BpostError('MPW-000', 'Temporary BPost unavailable', true),
    )

    const rows = [makeReadyRow(1, { seq: 1, priority: 'NP', Comps: { Comp: [{ code: '1', value: 'Test' }] } })]

    const result = await submitBatch(rows, MOCK_PARAMS, MOCK_CREDENTIALS)

    expect(result.success).toBe(false)
    expect(result.error?.retryable).toBe(true)
  })
})
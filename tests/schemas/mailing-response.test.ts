// tests/schemas/mailing-response.test.ts
import { describe, it, expect } from 'vitest'
import { MailingResponseSchema } from '@/schemas/mailing-response'

const validContext = {
  requestName: 'MailingResponse' as const,
  dataset: 'M037_MID' as const,
  sender: 'MID' as const,
  receiver: 12345678,
  version: '0100' as const,
}

const validHeader = {
  customerId: 12345678,
}

const validAction = {
  seq: 1,
  mailingRef: 'MAILING-001',
  Status: { code: 'OK' },
}

describe('MailingResponseSchema', () => {
  it('parses a minimal valid MailingResponse with a MailingCreate action', () => {
    const result = MailingResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      MailingCreate: [validAction],
    })
    expect(result.Context.requestName).toBe('MailingResponse')
    expect(result.MailingCreate?.[0].mailingRef).toBe('MAILING-001')
  })

  it('parses a response with no actions (global error)', () => {
    const result = MailingResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      Replies: {
        Reply: [{
          seq: 1,
          XPath: '/MailingRequest',
          Messages: {
            Message: [{ code: 'MID-001', severity: 'ERROR' }],
          },
        }],
      },
    })
    expect(result.Replies?.Reply[0].Messages.Message[0].code).toBe('MID-001')
  })

  it('rejects wrong requestName in Context', () => {
    expect(() => MailingResponseSchema.parse({
      Context: { ...validContext, requestName: 'DepositResponse' },
      Header: validHeader,
      MailingCreate: [validAction],
    })).toThrow()
  })

  it('rejects action missing Status', () => {
    expect(() => MailingResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      MailingCreate: [{ seq: 1, mailingRef: 'MAILING-001' }],
    })).toThrow()
  })

  it('accepts all four action types in one response', () => {
    const result = MailingResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      MailingCreate: [{ seq: 1, mailingRef: 'M1', Status: { code: 'OK' } }],
      MailingCheck: [{ seq: 2, mailingRef: 'M2', Status: { code: 'OK' } }],
      MailingDelete: [{ seq: 3, mailingRef: 'M3', Status: { code: 'OK' } }],
      MailingReuse: [{ seq: 4, mailingRef: 'M4', Status: { code: 'OK' } }],
    })
    expect(result.MailingCheck?.[0].seq).toBe(2)
    expect(result.MailingDelete?.[0].seq).toBe(3)
    expect(result.MailingReuse?.[0].seq).toBe(4)
  })
})

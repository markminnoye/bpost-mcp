// tests/schemas/deposit-response.test.ts
import { describe, it, expect } from 'vitest'
import { DepositResponseSchema } from '@/schemas/deposit-response'

const validContext = {
  requestName: 'DepositResponse' as const,
  dataset: 'M004_MPA' as const,
  sender: 'EMP' as const,
  receiver: 12345678,
  version: '0100' as const,
}

const validHeader = {
  customerId: 12345678,
  Files: {
    RequestProps: {
      fileName: 'request.xml',
      customerFileRef: 'ABC1234567',
    },
  },
}

const validAction = {
  seq: 1,
  Status: { code: 'OK' },
}

describe('DepositResponseSchema', () => {
  it('parses a minimal valid DepositResponse with one DepositCreate action', () => {
    const result = DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [validAction],
    })
    expect(result.Context.requestName).toBe('DepositResponse')
    expect(result.DepositCreate?.[0].seq).toBe(1)
  })

  it('parses a response without any action (global replies only)', () => {
    const result = DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      Replies: {
        Reply: [{
          seq: 1,
          XPath: '/DepositRequest',
          Messages: {
            Message: [{ code: 'MPW-001', severity: 'ERROR' }],
          },
        }],
      },
    })
    expect(result.Replies?.Reply[0].Messages.Message[0].code).toBe('MPW-001')
  })

  it('rejects Context with wrong requestName', () => {
    expect(() => DepositResponseSchema.parse({
      Context: { ...validContext, requestName: 'MailingResponse' },
      Header: validHeader,
    })).toThrow()
  })

  it('rejects action missing Status', () => {
    expect(() => DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1 }],
    })).toThrow()
  })

  it('rejects severity outside enum in Message', () => {
    expect(() => DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      Replies: {
        Reply: [{
          seq: 1,
          XPath: '/DepositRequest',
          Messages: {
            Message: [{ code: 'MPW-001', severity: 'CRITICAL' }],
          },
        }],
      },
    })).toThrow()
  })

  it('rejects MessageContent key exceeding max length', () => {
    const longKey = 'A'.repeat(251)
    expect(() => DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      Replies: {
        Reply: [{
          seq: 1,
          XPath: '/DepositRequest',
          Messages: {
            Message: [{
              code: 'MPW-001',
              severity: 'ERROR',
              MessageContents: {
                MessageContent: [{ key: longKey, value: 'val' }],
              },
            }],
          },
        }],
      },
    })).toThrow()
  })

  it('accepts all four action types', () => {
    const result = DepositResponseSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1, Status: { code: 'OK' } }],
      DepositUpdate: [{ seq: 2, Status: { code: 'OK' } }],
      DepositDelete: [{ seq: 3, Status: { code: 'OK' } }],
      DepositValidate: [{ seq: 4, Status: { code: 'OK' } }],
    })
    expect(result.DepositUpdate?.[0].seq).toBe(2)
    expect(result.DepositDelete?.[0].seq).toBe(3)
    expect(result.DepositValidate?.[0].seq).toBe(4)
  })
})

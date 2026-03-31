// tests/schemas/deposit-request.test.ts
import { describe, it, expect } from 'vitest'
import { DepositRequestSchema } from '@/schemas/deposit-request'

const validContext = {
  requestName: 'DepositRequest' as const,
  dataset: 'M004_MPA' as const,
  sender: 12345678,
  receiver: 'EMP' as const,
  version: '0100' as const,
}

describe('DepositRequestSchema', () => {
  it('parses a minimal valid DepositRequest envelope', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: {
        Files: {
          RequestProps: { filename: 'test.xml' },
          ResponseProps: { filename: 'test_resp.xml' },
        },
        CustomerRefs: { RequestProps: {}, ResponseProps: {} },
      },
      DepositCreate: [{}], // at least one action required by .refine()
    })
    expect(result.Context.requestName).toBe('DepositRequest')
  })

  it('rejects missing Context', () => {
    expect(() => DepositRequestSchema.parse({ Header: {}, DepositCreate: [] })).toThrow()
  })
})

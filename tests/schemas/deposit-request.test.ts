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

const validHeader = {
  customerId: 12345678,
  accountId: 9001,
  mode: 'P' as const,
  Files: {
    RequestProps: { customerFileRef: 'ABC1234567' },
  },
}

const validDeposit = {
  date: '2026-04-01',
  modelName: 'Standard',
  modelPortalUserName: 'john.doe',
  invoiceRef: 'INV2026001',
  meteringNumber: 'METER123456789',
  Items: {
    Item: [
      {
        seq: 1,
        Quantities: {
          Quantity: [{ unit: 'PCE', value: '500' }],
        },
      },
    ],
  },
  ItemCount: { value: 1 },
}

const validContract = { billTo: 99001 }

describe('DepositRequestSchema — Context', () => {
  it('parses a minimal valid DepositRequest', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{
        seq: 1,
        Contract: validContract,
        Deposit: validDeposit,
      }],
    })
    expect(result.Context.requestName).toBe('DepositRequest')
  })

  it('rejects wrong requestName', () => {
    expect(() => DepositRequestSchema.parse({
      Context: { ...validContext, requestName: 'MailingRequest' },
      Header: validHeader,
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })
})

describe('DepositRequestSchema — Header', () => {
  it('accepts valid header with all required fields', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })
    expect(result.Header.customerId).toBe(12345678)
    expect(result.Header.mode).toBe('P')
  })

  it('rejects missing customerId', () => {
    const { customerId: _, ...headerWithout } = validHeader
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: headerWithout,
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })

  it('rejects missing accountId', () => {
    const { accountId: _, ...headerWithout } = validHeader
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: headerWithout,
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })

  it('rejects invalid mode', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: { ...validHeader, mode: 'X' },
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })

  it('accepts customerFileRef matching [A-Z\\d]{10}', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: { ...validHeader, Files: { RequestProps: { customerFileRef: 'ABCD123456' } } },
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })
    expect(result.Header.Files.RequestProps.customerFileRef).toBe('ABCD123456')
  })

  it('rejects customerFileRef with lowercase letters', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: { ...validHeader, Files: { RequestProps: { customerFileRef: 'abc1234567' } } },
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })

  it('rejects customerFileRef with wrong length', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: { ...validHeader, Files: { RequestProps: { customerFileRef: 'ABC123' } } },
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })
})

describe('DepositRequestSchema — DepositCreate', () => {
  it('accepts a valid DepositCreate action', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1, Contract: validContract, Deposit: validDeposit }],
    })
    expect(result.DepositCreate?.[0].seq).toBe(1)
  })

  it('rejects DepositCreate missing seq', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ Contract: validContract, Deposit: validDeposit }],
    })).toThrow()
  })

  it('rejects DepositCreate missing Contract', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1, Deposit: validDeposit }],
    })).toThrow()
  })

  it('rejects DepositCreate missing Deposit', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{ seq: 1, Contract: validContract }],
    })).toThrow()
  })

  it('accepts optional depositIdentifier on Create', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [{
        seq: 1,
        depositIdentifier: 'DEP-001',
        Contract: validContract,
        Deposit: validDeposit,
      }],
    })
    expect(result.DepositCreate?.[0].depositIdentifier).toBe('DEP-001')
  })
})

describe('DepositRequestSchema — DepositDelete', () => {
  it('accepts a valid DepositDelete action', () => {
    const result = DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositDelete: [{ seq: 1, depositIdentifier: 'DEP-001' }],
    })
    expect(result.DepositDelete?.[0].depositIdentifier).toBe('DEP-001')
  })

  it('rejects DepositDelete missing depositIdentifier', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositDelete: [{ seq: 1 }],
    })).toThrow()
  })

  it('rejects invalid depositIdentifierType on Delete', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositDelete: [{ seq: 1, depositIdentifier: 'DEP-001', depositIdentifierType: 'invalid' }],
    })).toThrow()
  })
})

describe('DepositRequestSchema — refine', () => {
  it('rejects missing action arrays', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
    })).toThrow()
  })

  it('rejects empty action arrays', () => {
    expect(() => DepositRequestSchema.parse({
      Context: validContext,
      Header: validHeader,
      DepositCreate: [],
    })).toThrow()
  })
})

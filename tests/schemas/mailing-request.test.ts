// tests/schemas/mailing-request.test.ts
import { describe, it, expect } from 'vitest'
import { MailingRequestSchema } from '@/schemas/mailing-request'

const validMailingContext = {
  requestName: 'MailingRequest' as const,
  dataset: 'M037_MID' as const,
  sender: 12345678,
  receiver: 'MID' as const,
  version: '0200' as const,
}

const validHeader = {
  customerId: 12345678,
  accountId: 9001,
  mode: 'P' as const,
  Files: {
    RequestProps: { customerFileRef: 'MAIL000001' },
  },
}

const validItem = {
  seq: 1,
  priority: 'P' as const,
  Comps: {
    Comp: [{ code: '1' as const, value: 'Doe' }],
  },
}

const validMailingCreate = {
  seq: 1,
  mailingRef: 'MAILING-001',
  expectedDeliveryDate: '2026-04-15',
  FileInfo: { type: 'Large' },
  Format: { value: 'Large' as const },
  Items: { Item: [validItem] },
  ItemCount: { value: 1 },
}

describe('MailingRequestSchema — Context', () => {
  it('parses a minimal valid MailingRequest', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [validMailingCreate],
    })
    expect(result.Context.requestName).toBe('MailingRequest')
    expect(result.Context.dataset).toBe('M037_MID')
  })

  it('rejects wrong dataset in Context', () => {
    expect(() => MailingRequestSchema.parse({
      Context: { ...validMailingContext, dataset: 'M004_MPA' },
      Header: validHeader,
      MailingCreate: [validMailingCreate],
    })).toThrow()
  })
})

describe('MailingRequestSchema — Header', () => {
  it('accepts valid header', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [validMailingCreate],
    })
    expect(result.Header.customerId).toBe(12345678)
    expect(result.Header.accountId).toBe(9001)
  })

  it('rejects missing customerId', () => {
    const { customerId: _, ...headerWithout } = validHeader
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: headerWithout,
      MailingCreate: [validMailingCreate],
    })).toThrow()
  })

  it('rejects missing accountId', () => {
    const { accountId: _, ...headerWithout } = validHeader
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: headerWithout,
      MailingCreate: [validMailingCreate],
    })).toThrow()
  })

  it('rejects invalid mode', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: { ...validHeader, mode: 'X' },
      MailingCreate: [validMailingCreate],
    })).toThrow()
  })
})

describe('MailingRequestSchema — MailingCreate', () => {
  it('accepts a full valid MailingCreate', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [validMailingCreate],
    })
    expect(result.MailingCreate?.[0].mailingRef).toBe('MAILING-001')
  })

  it('rejects missing expectedDeliveryDate', () => {
    const { expectedDeliveryDate: _, ...withoutDate } = validMailingCreate
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [withoutDate],
    })).toThrow()
  })

  it('rejects invalid genMID value', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{ ...validMailingCreate, genMID: 'Y' }],
    })).toThrow()
  })

  it('accepts genMID with valid values', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{ ...validMailingCreate, genMID: '7' as const }],
    })
    expect(result.MailingCreate?.[0].genMID).toBe('7')
  })

  it('rejects invalid priority on Item', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{
        ...validMailingCreate,
        Items: { Item: [{ seq: 1, priority: 'EXPRESS', Comps: { Comp: [{ code: '1', value: 'X' }] } }] },
      }],
    })).toThrow()
  })

  it('rejects midNum with wrong length', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{
        ...validMailingCreate,
        Items: { Item: [{ seq: 1, priority: 'P', midNum: '12345', Comps: { Comp: [{ code: '1', value: 'X' }] } }] },
      }],
    })).toThrow()
  })

  it('accepts midNum with 14–18 digits', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{
        ...validMailingCreate,
        Items: { Item: [{ seq: 1, priority: 'P', midNum: '12345678901234', Comps: { Comp: [{ code: '1', value: 'X' }] } }] },
      }],
    })
    expect(result.MailingCreate?.[0].Items.Item[0].midNum).toBe('12345678901234')
  })

  it('rejects comp code outside allowed set', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCreate: [{
        ...validMailingCreate,
        Items: { Item: [{ seq: 1, priority: 'P', Comps: { Comp: [{ code: '99', value: 'X' }] } }] },
      }],
    })).toThrow()
  })
})

describe('MailingRequestSchema — MailingCheck', () => {
  it('rejects suggestionsMinScore below 1', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCheck: [{
        seq: 1,
        mailingRef: 'MAILING-001',
        suggestionsMinScore: 0,
        Items: { Item: [validItem] },
        ItemCount: { value: 1 },
      }],
    })).toThrow()
  })

  it('rejects suggestionsMinScore above 100', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingCheck: [{
        seq: 1,
        mailingRef: 'MAILING-001',
        suggestionsMinScore: 101,
        Items: { Item: [validItem] },
        ItemCount: { value: 1 },
      }],
    })).toThrow()
  })
})

describe('MailingRequestSchema — MailingDelete', () => {
  it('accepts a minimal valid MailingDelete', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingDelete: [{ seq: 1, mailingRef: 'MAILING-001' }],
    })
    expect(result.MailingDelete?.[0].mailingRef).toBe('MAILING-001')
  })
})

describe('MailingRequestSchema — MailingReuse', () => {
  it('accepts a valid MailingReuse', () => {
    const result = MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingReuse: [{
        seq: 1,
        mailingRef: 'MAILING-002',
        sourceMailingRef: 'MAILING-001',
        depositIdentifier: 'DEP-001',
      }],
    })
    expect(result.MailingReuse?.[0].sourceMailingRef).toBe('MAILING-001')
  })

  it('rejects MailingReuse missing depositIdentifier', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
      MailingReuse: [{
        seq: 1,
        mailingRef: 'MAILING-002',
        sourceMailingRef: 'MAILING-001',
        // depositIdentifier missing — required for Reuse
      }],
    })).toThrow()
  })
})

describe('MailingRequestSchema — refine', () => {
  it('rejects missing mailing actions', () => {
    expect(() => MailingRequestSchema.parse({
      Context: validMailingContext,
      Header: validHeader,
    })).toThrow()
  })
})

// tests/schemas/common.test.ts
import { describe, it, expect } from 'vitest'
import { BooleanTypeSchema, ContextSchema } from '@/schemas/common'

describe('BooleanTypeSchema', () => {
  it('accepts Y', () => expect(BooleanTypeSchema.parse('Y')).toBe('Y'))
  it('accepts N', () => expect(BooleanTypeSchema.parse('N')).toBe('N'))
  it('rejects anything else', () => {
    expect(() => BooleanTypeSchema.parse('yes')).toThrow()
    expect(() => BooleanTypeSchema.parse('')).toThrow()
  })
})

describe('ContextSchema', () => {
  it('parses a valid DepositRequest context', () => {
    const result = ContextSchema.parse({
      requestName: 'DepositRequest',
      dataset: 'M004_MPA',
      sender: 12345678,
      receiver: 'EMP',
      version: '0100',
    })
    expect(result.requestName).toBe('DepositRequest')
    expect(result.sender).toBe(12345678)
  })

  it('rejects wrong requestName', () => {
    expect(() => ContextSchema.parse({
      requestName: 'BadRequest',
      dataset: 'M004_MPA',
      sender: 123,
      receiver: 'EMP',
      version: '0100',
    })).toThrow()
  })
})

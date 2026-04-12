import { describe, it, expect } from 'vitest'
import { generateMidNumber } from '@/lib/batch/generate-barcode'

describe('generateMidNumber', () => {
  it('generates a valid 18-digit MID number', () => {
    const mid = generateMidNumber('04521', 15, 42, 0)
    expect(mid).toBe('120452115042000000')
    expect(mid).toHaveLength(18)
    expect(mid).toMatch(/^[0-9]{18}$/)
  })

  it('pads week number to 2 digits', () => {
    const mid = generateMidNumber('04521', 1, 0, 0)
    expect(mid).toBe('120452101000000000')
  })

  it('pads batch sequence to 3 digits', () => {
    const mid = generateMidNumber('04521', 15, 3, 0)
    expect(mid).toBe('120452115003000000')
  })

  it('pads row index to 6 digits', () => {
    const mid = generateMidNumber('04521', 15, 0, 42)
    expect(mid).toBe('120452115000000042')
  })

  it('handles maximum values', () => {
    const mid = generateMidNumber('99999', 53, 999, 999999)
    expect(mid).toBe('129999953999999999')
    expect(mid).toHaveLength(18)
  })

  it('starts with FCC 12 (customer-generated, 11-digit)', () => {
    const mid = generateMidNumber('04521', 15, 0, 0)
    expect(mid.slice(0, 2)).toBe('12')
  })

  it('includes barcodeCustomerId at positions 2-6', () => {
    const mid = generateMidNumber('04521', 15, 0, 0)
    expect(mid.slice(2, 7)).toBe('04521')
  })

  it('throws if barcodeCustomerId is not 5 digits', () => {
    expect(() => generateMidNumber('123', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
    expect(() => generateMidNumber('123456', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
    expect(() => generateMidNumber('abcde', 15, 0, 0)).toThrow('barcodeCustomerId must be exactly 5 digits')
  })

  it('throws if weekNumber is out of range', () => {
    expect(() => generateMidNumber('04521', 0, 0, 0)).toThrow('weekNumber must be 1–53')
    expect(() => generateMidNumber('04521', 54, 0, 0)).toThrow('weekNumber must be 1–53')
  })

  it('throws if batchSequence is out of range', () => {
    expect(() => generateMidNumber('04521', 15, -1, 0)).toThrow('batchSequence must be 0–999')
    expect(() => generateMidNumber('04521', 15, 1000, 0)).toThrow('batchSequence must be 0–999')
  })

  it('throws if rowIndex is out of range', () => {
    expect(() => generateMidNumber('04521', 15, 0, -1)).toThrow('rowIndex must be 0–999999')
    expect(() => generateMidNumber('04521', 15, 0, 1000000)).toThrow('rowIndex must be 0–999999')
  })
})
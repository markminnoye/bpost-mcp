import { describe, it, expect } from 'vitest'
import { addressesInfo, foreignInfo } from '@/components/mailing-flow/pill-info'

describe('foreignInfo', () => {
  it('counts addresses abroad, singular and plural', () => {
    expect(foreignInfo(1).tip).toBe('1 adres in het buitenland: kijk het land na')
    expect(foreignInfo(1234)).toEqual({ text: '1.234', tip: '1.234 adressen in het buitenland: kijk het land na' })
  })
})

describe('addressesInfo', () => {
  it('counts the rows that go to bpost: every row minus the excluded ones', () => {
    expect(addressesInfo({ rowCount: 789, excludedRows: 1 })).toEqual({
      text: '788',
      tip: '788 van de 789 adressen gaan mee (1 uitgesloten)',
      warn: false,
    })
  })
  it('names the file when it is known', () => {
    expect(addressesInfo({ rowCount: 1000, excludedRows: 0, fileName: 'a.xlsx' }).tip).toBe('1.000 adressen in a.xlsx')
  })
  it('is orange below the minimum, counting without the excluded rows', () => {
    expect(addressesInfo({ rowCount: 500, excludedRows: 0 }).warn).toBe(false)
    expect(addressesInfo({ rowCount: 500, excludedRows: 1 }).warn).toBe(true)
  })
  it('is orange for a large list', () => {
    expect(addressesInfo({ rowCount: 30000, excludedRows: 0 }).warn).toBe(true)
  })
})

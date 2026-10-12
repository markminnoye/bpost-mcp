import { describe, it, expect } from 'vitest'
import { addressFileBaseName, isAddressFileName } from '@/core/masspost/address-file'

describe('address file names', () => {
  it('takes Excel and OpenDocument files, in any case, and nothing else', () => {
    for (const name of ['a.xlsx', 'a.XLSM', 'a.xls', 'leden.ods']) expect(isAddressFileName(name)).toBe(true)
    for (const name of ['a.csv', 'a.numbers', 'a.xlsx.pdf', 'xlsx']) expect(isAddressFileName(name)).toBe(false)
  })

  it('strips only the extension of an address list', () => {
    expect(addressFileBaseName('Nieuwsbrief december.xlsm')).toBe('Nieuwsbrief december')
    expect(addressFileBaseName('leden.ODS')).toBe('leden')
    expect(addressFileBaseName('lijst.csv')).toBe('lijst.csv')
  })
})

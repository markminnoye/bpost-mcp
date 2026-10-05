import { describe, expect, it } from 'vitest'
import { maskExamples, maskValue } from '@/core/masspost/mask'

describe('maskValue', () => {
  it.each([
    ['Jan Peeters', 'Jxx Pxxxxxx'],
    ['Kerkstraat 12 bus 3', 'Kxxxstraat 12 bus 3'],
    ['1020 Brussel', '1020 Brussel'],
    ['jan@telenet.be', 'jxx@txxxxxx.be'],
    ['0475 12 34 56', '9999 99 99 99'],
    ['Peeters BV', 'Pxxxxxx BV'],
  ])('masks %j as %j (the examples Mark chose)', (input, expected) => {
    expect(maskValue(input)).toBe(expected)
  })

  it('keeps name particles and titles readable', () => {
    expect(maskValue('Jan Van de Velde')).toBe('Jxx Van de Vxxxx')
    expect(maskValue('Dhr. Jan Peeters')).toBe('Dhr. Jxx Pxxxxxx')
    expect(maskValue('Mevr. An Claes')).toBe('Mevr. Ax Cxxxx')
  })

  it('splits words on apostrophes and hyphens', () => {
    expect(maskValue("D'Hondt")).toBe("D'Hxxxx")
    expect(maskValue('Van den Bossche-Peeters')).toBe('Van den Bxxxxxx-Pxxxxxx')
  })

  it('treats accented letters as letters, also when decomposed', () => {
    expect(maskValue('Hélène Dupré')).toBe('Hxxxxx Dxxxx')
    expect(maskValue('Hélène')).toBe('Hxxxxx')
  })

  it('keeps a postcode followed by a place name readable', () => {
    expect(maskValue('B-1020 Brussel')).toBe('B-1020 Brussel')
    expect(maskValue('1234 AB Amsterdam')).toBe('1234 AB Amsterdam')
    expect(maskValue('75001 Paris')).toBe('75001 Paris')
  })

  it('does not read a house number at the start as a postcode', () => {
    expect(maskValue('12 rue Haute')).toBe('12 rue Hxxxx')
  })

  it('masks a city on its own, without a postcode', () => {
    expect(maskValue('Brussel')).toBe('Bxxxxxx')
  })

  it('keeps street types and box words readable', () => {
    expect(maskValue('Rue de la Loi 16 bte 2')).toBe('Rue de la Lxx 16 bte 2')
    expect(maskValue('Avenue Louise 54')).toBe('Avenue Lxxxxx 54')
    expect(maskValue('Zeedijk 5')).toBe('Zxxdijk 5')
  })

  it('masks a surname that only looks like a street suffix', () => {
    expect(maskValue('Dijk')).toBe('Dxxx')
  })

  it('keeps up to 6 digits per value and turns longer runs into 9', () => {
    expect(maskValue('123456')).toBe('123456')
    expect(maskValue('1234567')).toBe('9999999')
    expect(maskValue('BE68 5390 0754 7034')).toBe('BE99 9999 9999 9999')
  })

  it('keeps country names and a bare country code readable', () => {
    expect(maskValue('België')).toBe('België')
    expect(maskValue('Nederland')).toBe('Nederland')
    expect(maskValue('BE')).toBe('BE')
    expect(maskValue('BEL')).toBe('BEL')
  })

  it('masks short words in capitals, as in exports written in capitals', () => {
    expect(maskValue('JAN PEETERS')).toBe('JXX PXXXXXX')
    expect(maskValue('KERKSTRAAT 12')).toBe('KXXXSTRAAT 12')
  })

  it('keeps the extension of an e-mail address', () => {
    expect(maskValue('an.peeters@gmail.com')).toBe('ax.pxxxxxx@gxxxx.com')
  })

  it('leaves an empty value empty', () => {
    expect(maskValue('')).toBe('')
  })

  it('is idempotent, so the server can mask again', () => {
    const inputs = [
      'Jan Peeters',
      'Kerkstraat 12 bus 3',
      '1020 Brussel',
      'jan@telenet.be',
      '0475 12 34 56',
      'Peeters BV',
      "D'Hondt",
      'Hélène Dupré',
      'BE68 5390 0754 7034',
      'Zeedijk 5',
      'Dijk',
    ]
    for (const input of inputs) {
      const once = maskValue(input)
      expect(maskValue(once), input).toBe(once)
    }
  })

  it('can mask without initials or with other characters (evaluation only)', () => {
    expect(maskValue('Jan Peeters', { initials: false })).toBe('Xxx Xxxxxxx')
    expect(maskValue('Jan Peeters', { initials: false, upper: '*', lower: '*' })).toBe('*** *******')
  })
})

describe('maskExamples', () => {
  it('masks, removes duplicates after masking and sorts', () => {
    expect(maskExamples(['Peeters', 'Pauwels', 'Jan'])).toEqual(['Jxx', 'Pxxxxxx'])
  })

  it('does not change the input', () => {
    const values = ['Peeters', 'Jan']
    maskExamples(values)
    expect(values).toEqual(['Peeters', 'Jan'])
  })
})

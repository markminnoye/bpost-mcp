import { describe, it, expect } from 'vitest'
import { BOX_CANONICAL, BOX_KEYWORDS, isBoxKeyword } from '@/core/masspost/box-keywords'

describe('BOX_KEYWORDS (SR-83)', () => {
  it('lists bus, boîte, bte and box in an extendable list', () => {
    expect(BOX_KEYWORDS.map((entry) => [entry.keyword, entry.locale])).toEqual([
      ['bus', 'nl'],
      ['boîte', 'fr'],
      ['bte', 'fr'],
      ['box', 'en'],
    ])
  })

  it('keeps accents in the keyword spelling', () => {
    expect(BOX_KEYWORDS.some((entry) => entry.keyword === 'boîte')).toBe(true)
  })

  it('sends one canonical word to bpost', () => {
    expect(BOX_CANONICAL).toBe('bus')
  })
})

describe('isBoxKeyword', () => {
  it('recognises the Dutch word in any case', () => {
    expect(isBoxKeyword('bus')).toBe(true)
    expect(isBoxKeyword('Bus')).toBe(true)
    expect(isBoxKeyword('BUS')).toBe(true)
  })

  it('recognises the French words with or without accents, in any case', () => {
    expect(isBoxKeyword('boîte')).toBe(true)
    expect(isBoxKeyword('boite')).toBe(true)
    expect(isBoxKeyword('BOÎTE')).toBe(true)
    expect(isBoxKeyword('bte')).toBe(true)
    expect(isBoxKeyword('Bte')).toBe(true)
  })

  it('recognises English box from the addressing rules', () => {
    expect(isBoxKeyword('box')).toBe(true)
    expect(isBoxKeyword('BOX')).toBe(true)
  })

  it('rejects partial words, unknown forms and empty input', () => {
    expect(isBoxKeyword('bussen')).toBe(false)
    expect(isBoxKeyword('appartement')).toBe(false)
    expect(isBoxKeyword('bt')).toBe(false)
    expect(isBoxKeyword('')).toBe(false)
    expect(isBoxKeyword('   ')).toBe(false)
  })
})

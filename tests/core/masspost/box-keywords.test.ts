import { describe, it, expect } from 'vitest'
import { BOX_CANONICAL, BOX_KEYWORDS, isBoxKeyword } from '@/core/masspost/box-keywords'

describe('BOX_KEYWORDS (SR-83 starter set)', () => {
  it('starts with bus, boîte and bte, in an extendable list', () => {
    expect(BOX_KEYWORDS.slice(0, 3).map((entry) => [entry.keyword, entry.locale])).toEqual([
      ['bus', 'nl'],
      ['boîte', 'fr'],
      ['bte', 'fr'],
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

  it('rejects partial words, other languages and empty input', () => {
    expect(isBoxKeyword('bussen')).toBe(false)
    expect(isBoxKeyword('box')).toBe(false)
    expect(isBoxKeyword('appartement')).toBe(false)
    expect(isBoxKeyword('')).toBe(false)
    expect(isBoxKeyword('   ')).toBe(false)
  })
})

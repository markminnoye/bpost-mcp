// src/core/masspost/box-keywords.ts
// Box words the library recognises in the unstructured street block (Comp 92): Dutch
// "bus", French "boîte" and its abbreviation "bte". Only splitting and validation read
// this list in scope 3a (Linear SR-83) — no suggestions are built on it yet; those follow
// in 3b/SR-87 at the earliest. Pure and browser-safe: no Next.js, no AI, no cell values.

/** Language of a box word. Only Dutch and French in the starter set (SR-83). */
export type BoxLocale = 'nl' | 'fr'

/**
 * One word that marks a box number, such as "bus 3" or "bte 12".
 */
export interface BoxKeyword {
  /** The word as written (accents kept: "boîte", not "boite"). */
  keyword: string
  /** Language of the word. */
  locale: BoxLocale
  /** Why this entry exists, when that is not obvious (e.g. abbreviation of what). */
  note?: string
}

/**
 * Box words the library recognises, in the order to show them. Extensible on purpose:
 * add entries here when Contrapunt (Frank) delivers the full practice list — do not wait
 * for it, and do not build tooling around it (SR-83 product decision, 6 okt 2026).
 *
 * @example
 * BOX_KEYWORDS // [{ keyword: 'bus', locale: 'nl' }, …]
 */
export const BOX_KEYWORDS: readonly BoxKeyword[] = [
  { keyword: 'bus', locale: 'nl' },
  { keyword: 'boîte', locale: 'fr' },
  { keyword: 'bte', locale: 'fr', note: 'Afkorting van boîte' },
]

/**
 * The word sent to bpost when a slash is split into a box number ("12/3" becomes
 * "12 bus 3"). One canonical form regardless of the address language: bpost reads "bus".
 */
export const BOX_CANONICAL = 'bus'

function normalizeBoxWord(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/**
 * True when `word` is a known box word, accent- and case-insensitive, whole word only.
 * "bussen" is not a box word; "BOÎTE" is.
 *
 * @param word One word, e.g. the token before a box number in the street block.
 * @returns `true` for "bus", "boîte"/"boite" and "bte" in any case or accent spelling.
 * @example
 * isBoxKeyword('bte') // true
 * isBoxKeyword('bussen') // false
 */
export function isBoxKeyword(word: string): boolean {
  const key = normalizeBoxWord(word.trim())
  if (!key) return false
  return BOX_KEYWORDS.some((entry) => normalizeBoxWord(entry.keyword) === key)
}

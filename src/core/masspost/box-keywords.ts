// src/core/masspost/box-keywords.ts
// Box words the library recognises in the unstructured street block (Comp 92).
//
// Sources (do not invent entries outside these):
// - Linear SR-83 product decision (6 okt 2026): starter set bus / boîte / bte; list is
//   extendable; scope 3a = splitting and validation only (no suggestions on this list;
//   suggestions at earliest in 3b/SR-87).
// - docs/internal/e-masspost/docs/reference/addressing-rules.md (Belgian label formatting
//   and Group 3): box number must be preceded by `bus`, `bte`, or `box`; field 13 notes
//   also mention "boite" (without accent) as a form not to put in the structured box field.
//
// Pure and browser-safe: no Next.js, no AI, no cell values.

/** Language of a box word (SR-83: NL/FR starter; EN `box` from the addressing rules). */
export type BoxLocale = 'nl' | 'fr' | 'en'

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
 * append entries when Contrapunt (Frank) delivers more practice forms — do not wait for
 * that list, and do not build tooling around it (SR-83 product decision, 6 okt 2026).
 *
 * @example
 * BOX_KEYWORDS // [{ keyword: 'bus', locale: 'nl' }, …]
 */
export const BOX_KEYWORDS: readonly BoxKeyword[] = [
  { keyword: 'bus', locale: 'nl' },
  { keyword: 'boîte', locale: 'fr' },
  { keyword: 'bte', locale: 'fr', note: 'Afkorting van boîte' },
  { keyword: 'box', locale: 'en', note: 'Addressing rules: bus / bte / box' },
]

/**
 * The word sent to bpost when a slash is split into a box number ("12/3" becomes
 * "12 bus 3"). One canonical form regardless of the address language: bpost reads "bus".
 * French "bte" / "boîte" already in the input stay untouched (no rewrite in scope 3a).
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
 * @returns `true` for "bus", "boîte"/"boite", "bte" and "box" in any case or accent spelling.
 * @example
 * isBoxKeyword('bte') // true
 * isBoxKeyword('bussen') // false
 */
export function isBoxKeyword(word: string): boolean {
  const key = normalizeBoxWord(word.trim())
  if (!key) return false
  return BOX_KEYWORDS.some((entry) => normalizeBoxWord(entry.keyword) === key)
}

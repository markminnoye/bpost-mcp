// src/core/masspost/mask.ts
// Shape-preserving masking of sample values before they go to an AI model (ADR 0006).
// Pure and browser-safe: the browser masks before sending, the server masks again.

/** Options for `maskValue`. The defaults are what goes to the model; the rest is for evaluation. */
export interface MaskOptions {
  /** Keep the first letter of every word. Default `true`. */
  initials?: boolean
  /** Replacement for an upper-case letter. Default `'X'`. */
  upper?: string
  /** Replacement for any other letter. Default `'x'`. */
  lower?: string
}

/** Words that stay readable: they say what a column is, not who a row is about. Lower case, NFC. */
const KEEP_WORDS = new Set([
  // box and street types that stand on their own
  'bus', 'bte', 'boîte', 'boite', 'box', 'app', 'apt',
  'rue', 'avenue', 'chaussée', 'place', 'boulevard', 'chemin', 'allée', 'impasse', 'quai', 'route', 'square', 'drève',
  // legal forms
  'bv', 'nv', 'vzw', 'bvba', 'commv', 'cv', 'vof', 'sa', 'srl', 'sprl', 'asbl', 'scrl', 'snc',
  // name particles
  'van', 'de', 'der', 'den', 'ter', 'ten', 'het', 'vanden', 'vander', 'le', 'la', 'les', 'du', 'des', 'von',
  // titles
  'dhr', 'mevr', 'mr', 'mw', 'mme', 'mlle', 'fam', 'familie', 'famille',
  // countries
  'belgië', 'belgie', 'belgique', 'belgien', 'belgium', 'nederland', 'netherlands', 'pays', 'bas',
  'france', 'frankrijk', 'frankreich', 'deutschland', 'duitsland', 'allemagne', 'germany',
  'luxembourg', 'luxemburg', 'spanje', 'espagne', 'españa', 'italië', 'italie', 'italia',
])

/** Country codes, readable only in capitals: `BE`, but `Be` in a name is masked. */
const COUNTRY_CODES = new Set(['BE', 'NL', 'FR', 'DE', 'LU', 'GB', 'UK', 'ES', 'IT', 'BEL', 'NLD', 'FRA', 'DEU', 'LUX'])

/** Street-name endings that stay readable after a masked head of at least two letters. */
const STREET_SUFFIXES = ['steenweg', 'straat', 'laan', 'weg', 'plein', 'dreef', 'lei', 'kaai', 'baan', 'dijk']

/** A postcode (4 or 5 digits, optionally `B-`, optionally Dutch letters) followed by a place name. */
const POSTCODE_CITY = /^\s*(?:[A-Z]{1,2}-)?\d{4,5}(?:\s?[A-Z]{2})?\s+\p{L}/u

const WORD = /\p{L}+/gu
const MAX_READABLE_DIGITS = 6

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}

function maskLetters(letters: string, keepFirst: boolean, upper: string, lower: string): string {
  return [...letters].map((ch, i) => (keepFirst && i === 0 ? ch : isUpper(ch) ? upper : lower)).join('')
}

/** True when the word at `start..end` is the extension of an e-mail address (`be` in `jan@telenet.be`). */
function isEmailExtension(text: string, start: number, end: number): boolean {
  if (text[start - 1] !== '.') return false
  if (end < text.length && !/[\s>;,)]/.test(text[end])) return false
  const token = text.slice(0, end).split(/\s/).pop() ?? ''
  return token.includes('@')
}

function maskWord(word: string, options: Required<MaskOptions>): string {
  const lower = word.toLowerCase()
  if (KEEP_WORDS.has(lower) || COUNTRY_CODES.has(word)) return word
  const suffix = STREET_SUFFIXES.find((s) => lower.endsWith(s) && word.length - s.length >= 2)
  const head = suffix ? word.slice(0, -suffix.length) : word
  const tail = suffix ? word.slice(-suffix.length) : ''
  return maskLetters(head, options.initials, options.upper, options.lower) + tail
}

/**
 * Masks a cell value so that its shape survives but the person does not. Every word keeps its
 * first letter; the other letters become `X` (upper case) or `x`. A postcode followed by a place
 * name stays readable, as do street types, box words, legal forms, name particles, titles,
 * countries and the extension of an e-mail address. Up to 6 digits per value stay; a longer
 * run of digits (phone, account number) becomes `9`.
 *
 * Idempotent with the default options, so the server can mask what the browser already masked.
 *
 * @param value Cell value as text.
 * @param options Only for evaluation: without initials, or other replacement characters.
 * @returns The masked value.
 * @example
 * maskValue('Jan Peeters')         // 'Jxx Pxxxxxx'
 * maskValue('Kerkstraat 12 bus 3') // 'Kxxxstraat 12 bus 3'
 * maskValue('1020 Brussel')        // '1020 Brussel'
 * maskValue('0475 12 34 56')       // '9999 99 99 99'
 */
export function maskValue(value: string, options: MaskOptions = {}): string {
  const resolved: Required<MaskOptions> = { initials: true, upper: 'X', lower: 'x', ...options }
  const text = value.normalize('NFC')
  if (POSTCODE_CITY.test(text)) return text
  const manyDigits = (text.match(/\d/g) ?? []).length > MAX_READABLE_DIGITS
  return text
    .replace(WORD, (word: string, offset: number) =>
      isEmailExtension(text, offset, offset + word.length) ? word : maskWord(word, resolved),
    )
    .replace(/\d/g, (digit) => (manyDigits ? '9' : digit))
}

/**
 * Masks sample values for one column, removes the duplicates that masking creates and sorts the
 * result. Sorting breaks the link between columns: the first example of the name column no longer
 * belongs to the same row as the first example of the street column.
 *
 * @param values Raw sample values of one column.
 * @returns Masked, distinct, sorted values. The input is not changed.
 * @example
 * maskExamples(['Peeters', 'Pauwels', 'Jan']) // ['Jxx', 'Pxxxxxx']
 */
export function maskExamples(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => maskValue(value)))].sort()
}

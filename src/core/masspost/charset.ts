// src/core/masspost/charset.ts
// bpost files are ISO-8859-1 (docs/internal/e-masspost/docs/reference/character-restrictions.md).
// Node's `Buffer.from(xml, 'latin1')` does NOT reject other characters — it keeps only the low
// byte of each code point (U+2019 ’ → 0x19 control char, U+2026 … → 0x26 "&"), which silently
// corrupts addresses or produces malformed XML. Guard against that before encoding.

/**
 * Characters bpost does not accept that have one safe replacement: typographic quotes, dashes and
 * ellipsis from Excel/Word, letters without a Unicode decomposition (ł, đ, œ, ı) and the bullet.
 * Letters with an accent outside Latin-1 (ő, ź, …) are not listed: `normalizeForBpost` drops the
 * accent. The customer documentation lists every entry (`docs/documentatie/webapp/formaatvalidatie.md`).
 */
export const CHARACTER_REPLACEMENTS: Readonly<Record<string, string>> = {
  '\u2018': "'", // ‘
  '\u2019': "'", // ’
  '\u201A': "'", // ‚
  '\u201B': "'", // ‛
  '\u201C': '"', // “
  '\u201D': '"', // ”
  '\u201E': '"', // „
  '\u2010': '-', // ‐
  '\u2011': '-', // non-breaking hyphen
  '\u2012': '-', // ‒
  '\u2013': '-', // –
  '\u2014': '-', // —
  '\u2015': '-', // ―
  '\u2026': '...', // …
  '\u20AC': 'EUR', // €
  '\u0141': 'L', // Ł
  '\u0142': 'l', // ł
  '\u0110': 'D', // Đ
  '\u0111': 'd', // đ
  '\u0152': 'OE', // Œ
  '\u0153': 'oe', // œ
  '\u0131': 'i', // ı
  '\u2022': ' ', // •
}

/** Exotic whitespace → plain space; zero-width characters → removed. */
const EXOTIC_SPACE = /[ -   　]/g
const ZERO_WIDTH = /[​-‍⁠﻿]/g

/** True when bpost accepts the code point: HT/LF/CR, printable ASCII, and Latin-1 0xA0–0xFF.
 *  Control characters (incl. DEL and the C1 range 0x80–0x9F) are not supported.
 *
 * @param cp Unicode code point.
 * @returns `true` for tab, LF, CR, printable ASCII, and Latin-1 0xA0–0xFF.
 */
export function isBpostSafeCodePoint(cp: number): boolean {
  return (
    cp === 0x09 || cp === 0x0a || cp === 0x0d || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)
  )
}

/** Distinct characters in `text` that bpost does not accept, in order of appearance.
 *
 * @param text Any string, before or after normalization.
 * @returns Unique unsupported characters. Empty when every character is safe.
 */
export function findUnsupportedChars(text: string): string[] {
  const found = new Set<string>()
  for (const ch of text) {
    if (!isBpostSafeCodePoint(ch.codePointAt(0)!)) found.add(ch)
  }
  return [...found]
}

/** Text after safe replacements, plus the distinct characters that were changed. */
export interface NormalizedText {
  text: string
  /** Distinct characters that were replaced, e.g. `["’", "ő"]`. */
  replaced: string[]
}

/** Replaces what can be replaced safely: typographic quotes/dashes/ellipsis → ASCII,
 *  exotic spaces, and accented letters outside Latin-1 (ő → o) by dropping the accent.
 *  Anything else (ł, Cyrillic, emoji…) is left untouched so that validation can report it.
 *
 * @param text Raw address text.
 * @returns Normalized text and the characters that were replaced. Unsupported characters stay in `text`.
 * @example
 * normalizeForBpost('\u2019s-Hertogenbosch')
 * // { text: "'s-Hertogenbosch", replaced: ['\u2019'] }
 */
export function normalizeForBpost(text: string): NormalizedText {
  const replaced = new Set<string>()
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (isBpostSafeCodePoint(cp)) {
      out += ch
      continue
    }
    if (ch in CHARACTER_REPLACEMENTS) {
      out += CHARACTER_REPLACEMENTS[ch]
      replaced.add(ch)
      continue
    }
    if (EXOTIC_SPACE.test(ch)) {
      EXOTIC_SPACE.lastIndex = 0
      out += ' '
      replaced.add(ch)
      continue
    }
    EXOTIC_SPACE.lastIndex = 0
    if (ZERO_WIDTH.test(ch)) {
      ZERO_WIDTH.lastIndex = 0
      replaced.add(ch)
      continue
    }
    ZERO_WIDTH.lastIndex = 0
    const stripped = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (stripped !== ch && stripped.length > 0 && [...stripped].every((c) => isBpostSafeCodePoint(c.codePointAt(0)!))) {
      out += stripped
      replaced.add(ch)
      continue
    }
    out += ch
  }
  return { text: out, replaced: [...replaced] }
}

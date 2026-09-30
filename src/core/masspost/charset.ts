// src/core/masspost/charset.ts
// bpost files are ISO-8859-1 (docs/internal/e-masspost/docs/reference/character-restrictions.md).
// Node's `Buffer.from(xml, 'latin1')` does NOT reject other characters — it keeps only the low
// byte of each code point (U+2019 ’ → 0x19 control char, U+2026 … → 0x26 "&"), which silently
// corrupts addresses or produces malformed XML. Guard against that before encoding.

/** Typographic characters that Excel/Word insert and that have an unambiguous ASCII equivalent. */
const ASCII_EQUIVALENTS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '‚': "'",
  '‛': "'",
  '“': '"',
  '”': '"',
  '„': '"',
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '–': '-',
  '—': '-',
  '―': '-',
  '…': '...',
  '€': 'EUR',
}

/** Exotic whitespace → plain space; zero-width characters → removed. */
const EXOTIC_SPACE = /[ -   　]/g
const ZERO_WIDTH = /[​-‍⁠﻿]/g

/** True when bpost accepts the code point: HT/LF/CR, printable ASCII, and Latin-1 0xA0–0xFF.
 *  Control characters (incl. DEL and the C1 range 0x80–0x9F) are not supported. */
export function isBpostSafeCodePoint(cp: number): boolean {
  return (
    cp === 0x09 || cp === 0x0a || cp === 0x0d || (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff)
  )
}

/** Distinct characters in `text` that bpost does not accept, in order of appearance. */
export function findUnsupportedChars(text: string): string[] {
  const found = new Set<string>()
  for (const ch of text) {
    if (!isBpostSafeCodePoint(ch.codePointAt(0)!)) found.add(ch)
  }
  return [...found]
}

export interface NormalizedText {
  text: string
  /** Distinct characters that were replaced, e.g. `["’", "ő"]`. */
  replaced: string[]
}

/** Replaces what can be replaced safely: typographic quotes/dashes/ellipsis → ASCII,
 *  exotic spaces, and accented letters outside Latin-1 (ő → o) by dropping the accent.
 *  Anything else (ł, Cyrillic, emoji…) is left untouched so that validation can report it. */
export function normalizeForBpost(text: string): NormalizedText {
  const replaced = new Set<string>()
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (isBpostSafeCodePoint(cp)) {
      out += ch
      continue
    }
    if (ch in ASCII_EQUIVALENTS) {
      out += ASCII_EQUIVALENTS[ch]
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

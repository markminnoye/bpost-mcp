import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { CHARACTER_REPLACEMENTS } from '@/core/masspost/charset'
import { ABBREVIATIONS } from '@/core/masspost/format-check'

// The customer page lists every rule the code applies. This keeps both in step.
const doc = readFileSync(path.join(process.cwd(), 'docs/documentatie/webapp/formaatvalidatie.md'), 'utf8')
const lines = doc.split('\n')

describe('docs/documentatie/webapp/formaatvalidatie.md', () => {
  it('lists every character replacement next to its result', () => {
    for (const [char, replacement] of Object.entries(CHARACTER_REPLACEMENTS)) {
      const line = lines.find((l) => l.startsWith('|') && l.includes(char))
      expect(line, `character U+${char.codePointAt(0)!.toString(16).toUpperCase()} (${char})`).toBeDefined()
      if (replacement.trim()) expect(line).toContain(`\`${replacement}\``)
    }
  })

  it('lists every abbreviation in the order the code tries them', () => {
    const rows = ABBREVIATIONS.map(({ full, short }) => lines.findIndex((l) => l.startsWith(`| ${full} | ${short} |`)))
    rows.forEach((row, i) => expect(row, ABBREVIATIONS[i].full).toBeGreaterThan(-1))
    expect([...rows].sort((a, b) => a - b)).toEqual(rows)
  })
})

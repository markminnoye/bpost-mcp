import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  extractMailingResponseMessages,
  hasFatalMailingResponse,
} from '@/core/masspost/parse-response'

const FIXTURE_2RS = path.join(
  process.cwd(),
  'docs/samples/contrapunt/bpost-roundtrip/MID_0100_251614_REFERENCE0_260928215959_2RS.XML',
)

describe('parse MailingResponse (2RS)', () => {
  it('extracts MID-2040 from Contrapunt round-trip fixture', () => {
    const xml = readFileSync(FIXTURE_2RS, 'latin1')
    const messages = extractMailingResponseMessages(xml)
    expect(messages.some((m) => m.code === 'MID-2040' && m.severity === 'FATAL')).toBe(true)
    expect(hasFatalMailingResponse(xml)).toBe(true)
  })
})

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseBpostResponse, type MailingResult } from '@/core/masspost/parse-response'
import {
  CHECK_GROUPS,
  currentValue,
  estimateArr,
  groupCheckResult,
  inUserCase,
  isOpen,
  joinAddress,
  sameButCase,
  splitAddress,
  valueChanges,
} from '@/core/masspost/address-check'

const real = parseBpostResponse(
  readFileSync(path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip/MID_0200_251614_REFERENCE0_261001152310_2RS.XML'), 'latin1'),
) as MailingResult

const result = (items: MailingResult['items'], arr = 90): MailingResult => ({
  kind: 'check',
  requestFileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  statusCode: '100',
  arr,
  messages: [],
  items,
})
const msg = (code: string, severity = 'WARN', contents: Record<string, string> = {}) => ({ code, severity, contents })
const sent = { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' }

describe('inUserCase and sameButCase (decision 37 of 02/10)', () => {
  it('keeps the writing of the user and lowercases the box word', () => {
    expect(inUserCase('MOLENBEEKSESTRAAT 184 BUS 35', 'Molenbeeksestraat 184 35')).toBe('Molenbeeksestraat 184 bus 35')
    expect(inUserCase('KONING ALBERT I-LAAN 12', 'Koning Albertlaan 12')).toBe('Koning Albert I-laan 12')
    expect(inUserCase('STEYLSSTRAAT 92', 'STEYLSSTRAAT 92 ')).toBe('STEYLSSTRAAT 92')
  })
  it('sees a difference in capitals only', () => {
    expect(sameButCase('STEYLSSTRAAT 92', 'Steylsstraat  92')).toBe(true)
    expect(sameButCase('PAGODENLAAN 21 BUS 5', 'Pagodenlaan 21 5')).toBe(false)
  })
})

describe('splitAddress and joinAddress (decision 41 of 02/10)', () => {
  it('splits on the comma, or before the postcode', () => {
    expect(splitAddress('Kerkstraat 1, 9300 Aalst')).toEqual({ streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' })
    expect(splitAddress('Kerkstraat 1 9300 Aalst')).toEqual({ streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' })
    expect(splitAddress('Kerkstraat 1234 9300 Aalst')).toEqual({ streetHouseBox: 'Kerkstraat 1234', postcodeCity: '9300 Aalst' })
    expect(splitAddress('Kerkstraat 16 bus 1234 2000 Antwerpen')).toEqual({
      streetHouseBox: 'Kerkstraat 16 bus 1234',
      postcodeCity: '2000 Antwerpen',
    })
    expect(splitAddress('Kerkstraat 1')).toBeNull()
  })
  it('joins street and postcode', () => {
    expect(joinAddress(sent)).toBe('Kerkstraat 1, 9300 Aalst')
  })
})

describe('groupCheckResult', () => {
  it('groups the live sample: real proposals, capitals only is in order', () => {
    const view = groupCheckResult(real, 5)
    const proposals = view.rows.filter((r) => r.group === 'proposal')
    expect(proposals.map((r) => r.seq)).toEqual([1, 2]) // 3, 4 and 5 differ only in capitals
    expect(proposals[0]).toMatchObject({ seq: 1, field: 'streetHouseBox', original: 'Molenbeeksestraat 184 35', proposal: 'Molenbeeksestraat 184 bus 35', options: [{ value: 'Molenbeeksestraat 184 bus 35', source: 'OptiAddress' }] })
    expect(view.rows.find((r) => r.seq === 3)?.group).toBe('ok') // STEYLSSTRAAT 92 vs Steylsstraat 92
    expect(view.counts).toEqual({ noAddress: 0, multiple: 0, proposal: 2, note: 0, ok: 3 })
  })

  it('puts unknown addresses, multiple matches, notes and unknown codes in their group', () => {
    const view = groupCheckResult(
      result([
        { seq: 58, messages: [msg('MID-4010', 'ERROR')], suggestions: [], candidates: [], sent },
        { seq: 412, messages: [msg('MID-4020', 'ERROR')], suggestions: [], candidates: [{ streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9300 AALST' }], sent },
        { seq: 77, messages: [msg('MID-4060')], suggestions: [], candidates: [], sent },
        { seq: 90, messages: [msg('MID-9999')], suggestions: [], candidates: [], sent },
      ]),
      10,
    )
    expect(view.rows.find((r) => r.seq === 58)).toMatchObject({ group: 'noAddress', field: 'address', key: '58:address', original: 'Kerkstraat 1, 9300 Aalst' })
    expect(view.rows.find((r) => r.seq === 412)?.options).toEqual([{ value: 'Kerkstraat 1, 9300 Aalst', source: 'OptiAddress' }])
    expect(view.rows.find((r) => r.seq === 77)).toMatchObject({ group: 'note', note: 'Gebouw gevonden, maar geen perfecte match. Optioneel nakijken.' })
    expect(view.rows.find((r) => r.seq === 90)).toMatchObject({ group: 'note', note: 'Onbekende melding van e-MassPost (MID-9999).' })
    expect(view.unknownCodes).toEqual(['MID-9999'])
    expect(view.counts).toEqual({ noAddress: 1, multiple: 1, proposal: 0, note: 2, ok: 6 })
  })
})

describe('open rows and the estimate (decision 39 of 02/10)', () => {
  const view = groupCheckResult(
    result([
      { seq: 58, messages: [msg('MID-4010', 'ERROR')], suggestions: [], candidates: [], sent },
      { seq: 2, messages: [msg('7001', 'WARN', { compCode: '92', compCorrection: 'KERKSTRAAT 1 BUS 2' })], suggestions: [{ field: 'streetHouseBox', value: 'KERKSTRAAT 1 BUS 2', source: 'OptiAddress' }], candidates: [], sent },
    ], 90),
    10,
  )
  const unknown = view.rows.find((r) => r.seq === 58)!
  const proposal = view.rows.find((r) => r.seq === 2)!

  it('a row is open until it changes or is excluded', () => {
    expect(isOpen(unknown, {}, {})).toBe(true)
    expect(isOpen(unknown, {}, { 58: true })).toBe(false)
    const changes = valueChanges(unknown, 'Kerkstraat 10, 9300 Aalst')
    expect(changes).toEqual([
      { key: '58:streetHouseBox', value: 'Kerkstraat 10' },
      { key: '58:postcodeCity', value: undefined },
    ])
    const values = { '58:streetHouseBox': 'Kerkstraat 10' }
    expect(currentValue(unknown, values)).toBe('Kerkstraat 10, 9300 Aalst')
    expect(isOpen(unknown, values, {})).toBe(false)
    expect(isOpen(proposal, { '2:streetHouseBox': 'Kerkstraat 1 bus 2' }, {})).toBe(false)
  })

  it('estimates the ARR from the fixes and exclusions', () => {
    const base = { arr: 90, sentItems: 10, rows: view.rows, excludedAtSend: [] }
    expect(estimateArr({ ...base, values: {}, excluded: {} })).toBe(90)
    expect(estimateArr({ ...base, values: { '58:streetHouseBox': 'Kerkstraat 10' }, excluded: {} })).toBe(100)
    expect(estimateArr({ ...base, values: {}, excluded: { 58: true } })).toBe(100) // 9 of 9
    expect(estimateArr({ ...base, arr: null, values: {}, excluded: {} })).toBeNull()
  })
})

describe('CHECK_GROUPS', () => {
  it('names the service e-MassPost (design 13/10, decision 23)', () => {
    expect(CHECK_GROUPS.map((g) => g.title)).toEqual([
      'Geen adres gevonden',
      'Meerdere adressen gevonden',
      'Voorstel van e-MassPost',
      'Opmerking zonder voorstel',
      'In orde',
    ])
  })
})

describe('corrections from step 3 stay (review 14/10, finding 1)', () => {
  // Step 3 corrected the postcode "aalst" to "9300 Aalst"; e-MassPost echoes what was sent.
  const sentFixed = { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' }
  const raw = new Map([[58, { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: 'aalst' }]])
  const fromStep3 = { '58:postcodeCity': '9300 Aalst' }

  it('an address change in step 4 keeps the postcode correction of step 3', () => {
    const view = groupCheckResult(result([{ seq: 58, messages: [msg('MID-4010', 'ERROR')], suggestions: [], candidates: [], sent: sentFixed }]), 10, raw)
    const row = view.rows[0]
    expect(currentValue(row, fromStep3)).toBe('Kerkstraat 1, 9300 Aalst')
    expect(valueChanges(row, 'Kerkstraat 10, 9300 Aalst')).toEqual([
      { key: '58:streetHouseBox', value: 'Kerkstraat 10' },
      { key: '58:postcodeCity', value: '9300 Aalst' },
    ])
    expect(valueChanges(row, 'Kerkstraat 1, aalst')).toEqual([])
  })

  it('putting the value as sent back keeps the correction of step 3, and the raw value clears it', () => {
    const sentStreet = { ...sentFixed, streetHouseBox: 'Kerkstraat 1 2' }
    const rawStreet = new Map([[2, { name: 'Luc', streetHouseBox: 'Kerkstraat  1 2', postcodeCity: '9300 Aalst' }]])
    const view = groupCheckResult(
      result([{ seq: 2, messages: [msg('7001', 'WARN', { compCode: '92', compCorrection: 'KERKSTRAAT 1 BUS 2' })], suggestions: [{ field: 'streetHouseBox', value: 'KERKSTRAAT 1 BUS 2', source: 'OptiAddress' }], candidates: [], sent: sentStreet }]),
      10,
      rawStreet,
    )
    const row = view.rows[0]
    expect(valueChanges(row, row.original)).toEqual([{ key: '2:streetHouseBox', value: 'Kerkstraat 1 2' }])
    expect(valueChanges(row, 'Kerkstraat  1 2')).toEqual([{ key: '2:streetHouseBox', value: undefined }])
    expect(currentValue(row, {})).toBe('Kerkstraat  1 2')
  })
})

describe('notes name e-MassPost (decision 23, review finding 12)', () => {
  it('explains MID-4000 without "bpost"', () => {
    const view = groupCheckResult(result([{ seq: 7, messages: [msg('MID-4000')], suggestions: [], candidates: [], sent }]), 1)
    expect(view.rows[0].note).toBe('Een deel van het adres klopt niet volgens e-MassPost. Optioneel nakijken.')
  })
})

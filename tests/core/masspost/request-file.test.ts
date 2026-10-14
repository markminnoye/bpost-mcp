import { describe, it, expect } from 'vitest'
import type { MappedField, MappedRow } from '@/core/masspost/mapping'
import {
  buildRequestFile,
  checkMailingRef,
  correctedRows,
  createMailingRef,
  decodeLatin1,
  encodeLatin1,
  itemsFingerprint,
  readRequestItems,
  RequestInvalidError,
} from '@/core/masspost/request-file'

const f = (value: string): MappedField => ({ value, truncated: false, originalLength: value.length, replacedChars: [], unsupportedChars: [] })
const row = (seq: number, street: string, city = '1020 Brussel'): MappedRow => ({
  seq,
  source: {},
  fields: { name: f('Anna Vanderstappen'), streetHouseBox: f(street), postcodeCity: f(city) },
})
const ids = { customerId: '251614', accountId: '1234567' }
const now = new Date(2026, 9, 13, 14, 5, 0)

describe('correctedRows', () => {
  it('applies corrections by <seq>:<field> and drops excluded rows', () => {
    const rows = [row(2, 'Molenbeeksestraat 184 35'), row(3, 'Pagodenlaan 21 5'), row(4, 'Steylsstraat 92')]
    const out = correctedRows(rows, { '2:streetHouseBox': 'Molenbeeksestraat 184 bus 35', '3:companyDepartment': 'Dienst X' }, [4])
    expect(out.map((r) => r.seq)).toEqual([2, 3])
    expect(out[0].fields.streetHouseBox.value).toBe('Molenbeeksestraat 184 bus 35')
    expect(out[1].fields.companyDepartment?.value).toBe('Dienst X')
    expect(rows[0].fields.streetHouseBox.value).toBe('Molenbeeksestraat 184 35') // input untouched
  })
})

describe('mailingRef', () => {
  it('numbers checks and later submissions, within 20 characters', () => {
    expect(checkMailingRef('CP-2026-15', 1)).toBe('CP-2026-15-C1')
    expect(createMailingRef('CP-2026-15', 1)).toBe('CP-2026-15')
    expect(createMailingRef('CP-2026-15', 2)).toBe('CP-2026-15-2')
    const long = 'ABCDEFGHIJ-2026-1234' // 20 characters
    expect(checkMailingRef(long, 12)).toHaveLength(20)
    expect(checkMailingRef(long, 12).endsWith('-C12')).toBe(true)
    expect(createMailingRef(long, 3)).toHaveLength(20)
  })
})

describe('Latin-1', () => {
  it('encodes and decodes accents byte for byte', () => {
    const bytes = encodeLatin1('Liège é ë ç')
    expect(bytes[2]).toBe(0xe8)
    expect(decodeLatin1(bytes)).toBe('Liège é ë ç')
  })
  it('refuses a character outside ISO-8859-1', () => {
    expect(() => encodeLatin1('€')).toThrow(/ISO-8859-1/)
  })
})

describe('buildRequestFile', () => {
  it('builds a MailingCheck in T with the canonical file name, Latin-1 bytes and the row numbers as seq', async () => {
    const file = await buildRequestFile({
      kind: 'check',
      rows: [row(2, 'Rue de Liège 4'), row(5, 'Steylsstraat 92')],
      mailingRef: 'CP-2026-15-C1',
      mode: 'P', // ignored: a check is always T
      priority: 'NP',
      ids,
      now,
    })
    expect(file.fileName).toBe('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')
    expect(file).toMatchObject({ kind: 'check', mailingRef: 'CP-2026-15-C1', mode: 'T', items: 2 })
    const xml = decodeLatin1(file.bytes)
    expect(xml).toContain('<MailingCheck')
    expect(xml).toContain('mode="T"')
    expect(xml).toContain('seq="5"')
    expect(xml).toContain('Rue de Liège 4')
    expect(file.fingerprint).toMatch(/^[0-9a-f]{64}$/)
  })

  it('builds a MailingCreate in the chosen mode with the details of step 1', async () => {
    const file = await buildRequestFile({
      kind: 'create',
      rows: [row(2, 'Steylsstraat 92')],
      mailingRef: 'CP-2026-15',
      mode: 'P',
      priority: 'NP',
      ids,
      now,
      create: { expectedDeliveryDate: '2026-10-23', format: 'Small', genMID: '7', genPSC: 'N' },
    })
    const xml = decodeLatin1(file.bytes)
    expect(file.mode).toBe('P')
    expect(xml).toContain('<MailingCreate')
    expect(xml).toContain('mode="P"')
    expect(xml).toContain('expectedDeliveryDate="2026-10-23"')
    expect(xml).toContain('genMID="7"')
  })

  it('throws RequestInvalidError when the request fails the schema', async () => {
    await expect(
      buildRequestFile({ kind: 'check', rows: [row(2, 'x'.repeat(80))], mailingRef: 'CP-2026-15-C1', mode: 'T', priority: 'NP', ids, now }),
    ).rejects.toBeInstanceOf(RequestInvalidError)
  })

  it('gives the same fingerprint for the same items, another after a change', async () => {
    const a = await itemsFingerprint([row(2, 'Steylsstraat 92')], 'NP')
    expect(await itemsFingerprint([row(2, 'Steylsstraat 92')], 'NP')).toBe(a)
    expect(await itemsFingerprint([row(2, 'Steylsstraat 93')], 'NP')).not.toBe(a)
  })
})

describe('readRequestItems', () => {
  it('reads the addresses of a request back, by seq', async () => {
    const file = await buildRequestFile({
      kind: 'check',
      rows: [row(5, 'Rue de Liège 4')],
      mailingRef: 'CP-2026-15-C1',
      mode: 'T',
      priority: 'NP',
      ids,
      now,
    })
    expect(readRequestItems(decodeLatin1(file.bytes)).get(5)).toEqual({
      name: 'Anna Vanderstappen',
      streetHouseBox: 'Rue de Liège 4',
      postcodeCity: '1020 Brussel',
    })
  })
})

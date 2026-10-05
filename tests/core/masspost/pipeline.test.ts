import { describe, it, expect } from 'vitest'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { convertExcelToMailingRequest } from '@/core/masspost/pipeline'
import type { ColumnMapping } from '@/core/masspost/mapping'
import type { BuildRequestParams } from '@/core/masspost/build-request'

async function buildFixture(): Promise<Buffer> {
  return xlsxBuffer(
    [
      ['Naam', 'Straat', 'Nummer', 'Postcode', 'Gemeente'],
      ['Jan Janssens', 'Kerkstraat', '10', '2000', 'Antwerpen'],
      ['Marie Peeters', 'Dorpsstraat', '3', '9000', 'Gent'],
    ],
    'Adressen',
  )
}

const mapping: ColumnMapping = {
  name: ['Naam'],
  streetHouseBox: ['Straat', 'Nummer'],
  postcodeCity: ['Postcode', 'Gemeente'],
}

const params: BuildRequestParams = {
  mailingRef: 'TESTMAILING1',
  expectedDeliveryDate: '2026-10-01',
  format: 'Large',
  priority: 'NP',
  mode: 'T',
  customerFileRef: 'CF1234',
  genMID: 'N',
  genPSC: 'N',
}

const credentials = { customerId: '123456', accountId: '789', midVersion: '0100' as const }

describe('convertExcelToMailingRequest (end-to-end, no network)', () => {
  it('goes from a raw Excel buffer to validated, ready-to-send XML', async () => {
    const buffer = await buildFixture()
    const result = await convertExcelToMailingRequest(buffer, mapping, params, credentials)

    expect(result.itemCount).toBe(2)
    expect(result.sourceItemCount).toBe(2)
    expect(result.warnings).toEqual([])
    expect(result.validation.valid).toBe(true)
    expect(result.xml).toBeDefined()
    expect(result.xml).toContain('Kerkstraat 10')
    expect(result.xml).toContain('2000 Antwerpen')
  })

  it('caps rows with maxItems (test-mode 200 limit)', async () => {
    const buffer = await buildFixture()
    const result = await convertExcelToMailingRequest(buffer, mapping, params, {
      ...credentials,
      maxItems: 1,
    })

    expect(result.sourceItemCount).toBe(2)
    expect(result.itemCount).toBe(1)
    expect(result.xml).toContain('ItemCount value="1"')
  })

  it('surfaces mapping warnings for rows with gaps without blocking the others', async () => {
    const buffer = xlsxBuffer(
      [
        ['Naam', 'Straat', 'Nummer', 'Postcode', 'Gemeente'],
        ['Jan Janssens', 'Kerkstraat', '10', '2000', 'Antwerpen'],
        ['', '', '', '9000', 'Gent'], // missing name + street
      ],
      'Adressen',
    )

    const result = await convertExcelToMailingRequest(buffer, mapping, params, credentials)

    expect(result.itemCount).toBe(2)
    expect(result.warnings.some((w) => w.seq === 2 && w.field === 'name')).toBe(true)
    expect(result.warnings.some((w) => w.seq === 2 && w.field === 'streetHouseBox')).toBe(true)
    // Structurally still valid Zod-wise (empty strings are allowed) — mapping warnings are
    // a data-quality signal for the user, not a hard validation failure.
    expect(result.validation.valid).toBe(true)
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { mapRows, type ColumnMapping } from '@/core/masspost/mapping'
import { rowsToItems, buildMailingRequest, buildMailingCheckRequest, FORCE_TEST_MODE } from '@/core/masspost/build-request'
import { validateMailingRequest } from '@/core/masspost/validate'
import { buildXml } from '@/lib/xml'

const mapping: ColumnMapping = {
  name: ['Naam'],
  streetHouseBox: ['Adres'],
  postcodeCity: ['Postcode'],
}

const params = {
  mailingRef: 'TESTMAILING1',
  expectedDeliveryDate: '2026-10-01',
  format: 'Large' as const,
  priority: 'NP' as const,
  mode: 'T' as const,
  customerFileRef: 'CF1234',
  genMID: 'N' as const,
  genPSC: 'N' as const,
}

const credentials = { customerId: '123456', accountId: '789', midVersion: '0100' as const }

describe('rowsToItems + buildMailingRequest', () => {
  it('produces Comp codes 90/92/93 for the unstructured fields (matches AFT columns U/W/X)', () => {
    const { rows } = mapRows(
      [{ Naam: 'Jan Janssens', Adres: 'Kerkstraat 10', Postcode: '2000 Antwerpen' }],
      mapping,
    )
    const items = rowsToItems(rows, params.priority)

    expect(items[0].Comps.Comp).toEqual([
      { code: '90', value: 'Jan Janssens' },
      { code: '92', value: 'Kerkstraat 10' },
      { code: '93', value: '2000 Antwerpen' },
    ])
    expect(items[0].seq).toBe(1)
    expect(items[0].priority).toBe('NP')
  })

  it('builds a MailingRequest that passes Zod validation end to end', () => {
    const { rows } = mapRows(
      [
        { Naam: 'Jan Janssens', Adres: 'Kerkstraat 10', Postcode: '2000 Antwerpen' },
        { Naam: 'Marie Peeters', Adres: 'Dorpsstraat 3', Postcode: '9000 Gent' },
      ],
      mapping,
    )
    const items = rowsToItems(rows, params.priority)
    const request = buildMailingRequest(items, params, credentials)
    const result = validateMailingRequest(request, credentials.midVersion)

    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('validation catches a broken request (e.g. missing MailingCreate action)', () => {
    const result = validateMailingRequest({
      Context: { requestName: 'MailingRequest', dataset: 'M037_MID', sender: 1, receiver: 'MID', version: '0100' },
      Header: { customerId: 1, accountId: 1, mode: 'T', Files: { RequestProps: { customerFileRef: 'X' } } },
    })

    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('produces XML that bpost\'s HTTP client can send as-is', () => {
    const { rows } = mapRows([{ Naam: 'Jan', Adres: 'Straat 1', Postcode: '1000 Brussel' }], mapping)
    const items = rowsToItems(rows, params.priority)
    const request = buildMailingRequest(items, params, credentials)
    const { valid, data } = validateMailingRequest(request, credentials.midVersion)

    expect(valid).toBe(true)
    const xml = buildXml({ MailingRequest: data })
    expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>')
    expect(xml).toContain('MailingRequest')
    expect(xml).toContain('code="90"')
    expect(xml).not.toContain('expectedDeliveryDate')
    expect(xml).not.toContain('FileInfo')
  })

  it('includes expectedDeliveryDate and FileInfo for MID protocol version 0200', () => {
    const { rows } = mapRows([{ Naam: 'Jan', Adres: 'Straat 1', Postcode: '1000 Brussel' }], mapping)
    const items = rowsToItems(rows, params.priority)
    const request = buildMailingRequest(items, params, { ...credentials, midVersion: '0200' })
    const { valid, data } = validateMailingRequest(request, '0200')

    expect(valid).toBe(true)
    const xml = buildXml({ MailingRequest: data })
    expect(xml).toContain('expectedDeliveryDate="2026-10-01"')
    expect(xml).toContain('FileInfo')
    expect(xml).toContain('type="MID2"')
    expect(xml.indexOf('FileInfo')).toBeLessThan(xml.indexOf('<Format>'))
  })

  it('builds OptiAddress MailingCheck with suggestions flags', () => {
    const { rows } = mapRows([{ Naam: 'Jan', Adres: 'Straat 1', Postcode: '1000 Brussel' }], mapping)
    const items = rowsToItems(rows, params.priority)
    const request = buildMailingCheckRequest(
      items,
      {
        mailingRef: 'OPTITEST1',
        priority: 'NP',
        mode: 'T',
        customerFileRef: 'REFERENCE0',
        copyRequestItem: 'Y',
        suggestionsCount: 5,
        suggestionsMinScore: 60,
      },
      { ...credentials, midVersion: '0200' },
    )
    const { valid, data } = validateMailingRequest(request, '0200')
    expect(valid).toBe(true)
    const xml = buildXml({ MailingRequest: data })
    expect(xml).toContain('MailingCheck')
    expect(xml).not.toContain('MailingCreate')
    expect(xml).toContain('copyRequestItem="Y"')
    expect(xml).toContain('suggestionsCount="5"')
    expect(xml).toContain('lang="nl"')
    expect(xml).not.toContain('FileInfo')
    expect(xml).not.toContain('expectedDeliveryDate')
  })


  describe('FORCE_TEST_MODE safety guard', () => {
    afterEach(() => vi.restoreAllMocks())

    it('is on (Contrapunt is not yet certified for Production/Certification)', () => {
      expect(FORCE_TEST_MODE).toBe(true)
    })

    it('always sends mode="T", even when Production or Certification is requested', () => {
      const { rows } = mapRows([{ Naam: 'Jan', Adres: 'Straat 1', Postcode: '1000 Brussel' }], mapping)
      const items = rowsToItems(rows, params.priority)

      const productionRequest = buildMailingRequest(items, { ...params, mode: 'P' }, credentials)
      expect(productionRequest.Header.mode).toBe('T')

      const certificationRequest = buildMailingRequest(items, { ...params, mode: 'C' }, credentials)
      expect(certificationRequest.Header.mode).toBe('T')
    })

    it('warns loudly (not silently) when overriding a non-Test mode request', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { rows } = mapRows([{ Naam: 'Jan', Adres: 'Straat 1', Postcode: '1000 Brussel' }], mapping)
      const items = rowsToItems(rows, params.priority)

      buildMailingRequest(items, { ...params, mode: 'P' }, credentials)

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('FORCE_TEST_MODE'))
    })
  })
})

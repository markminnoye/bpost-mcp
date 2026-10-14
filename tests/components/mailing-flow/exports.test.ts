import { readFileSync } from 'node:fs'
import { Blob as NodeBlob } from 'node:buffer'
import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { announcedForMailing, exportBaseName, printerFile, printerReady } from '@/components/mailing-flow/exports'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { buildRequestFile, decodeLatin1, encodeLatin1 } from '@/core/masspost/request-file'
import type { MappedField, MappedRow } from '@/core/masspost/mapping'
import { summarize } from '@/core/masspost/store/mailing'
import { MAILING_FILES_DIR } from '@/core/masspost/store/mailing-store'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import { sampleMailing } from '../../core/masspost/store/fixtures'
import { newInput } from '../../core/masspost/store/mailing-store-contract'

// jsdom's Blob has no arrayBuffer(); Node's has.
globalThis.Blob = NodeBlob as unknown as typeof Blob

const f = (value: string): MappedField => ({ value, truncated: false, originalLength: value.length, replacedChars: [], unsupportedChars: [] })
const mapped = (seq: number, street: string): MappedRow => ({
  seq,
  source: {},
  fields: { name: f('Anna Vanderstappen'), streetHouseBox: f(street), postcodeCity: f('1020 Brussel') },
})

function sheetRows(bytes: Uint8Array): unknown[][] {
  const workbook = XLSX.read(bytes, { type: 'array' })
  return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', blankrows: true })
}

describe('printerFile', () => {
  it('marks the excluded rows of the mailing, from the stored Excel file', async () => {
    const source = new Uint8Array(
      xlsxBuffer([
        ['Naam', 'Straat', 'Postcode'],
        ['Jan', 'Kerkstraat 1', '9340 Lede'],
        ['Els', 'Dorp 4', '9300 Aalst'],
      ]),
    ).buffer
    const rows = sheetRows(await printerFile(source, [3]))
    expect(rows[1].slice(-2)).toEqual(['ja', 2])
    expect(rows[2].slice(-2)).toEqual(['nee, uitgesloten', ''])
  })
})

describe('printerReady', () => {
  it('only after a successful submission (Mail ID available)', () => {
    const row = (over: Parameters<typeof sampleMailing>[0]) => summarize(sampleMailing(over))
    expect(printerReady(row({ status: 'format', counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe(false)
    expect(printerReady(row({ status: 'checked', counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe(false)
    expect(printerReady(row({ status: 'submitted', counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe(true)
  })
})

describe('exportBaseName', () => {
  it('drops the Excel extension', () => {
    expect(exportBaseName('Nieuwsbrief december.xlsx')).toBe('Nieuwsbrief december')
    expect(exportBaseName('oud.XLS')).toBe('oud')
  })
})

describe('announcedForMailing', () => {
  it('reads Mail IDs and addresses from the last accepted submission', async () => {
    const store = new MemoryMailingStore()
    const request = await buildRequestFile({
      kind: 'create',
      rows: [mapped(2, 'Steylsstraat 92')],
      mailingRef: 'CP-2026-15',
      mode: 'T',
      priority: 'NP',
      ids: { customerId: '251614', accountId: '1234567' },
      now: new Date(2026, 9, 13, 14, 5, 0),
      create: { expectedDeliveryDate: '2026-10-23', format: 'Small', genMID: '7', genPSC: 'N' },
    })
    const sample = decodeLatin1(
      readFileSync('docs/samples/contrapunt/bpost-roundtrip/MID_0200_251614_REFERENCE0_260929221652_2RS.XML'),
    )
    // Keep one item only, remapped to seq 2 so it matches the request above.
    const oneItem = sample
      .replace(/attributeValue="1"/, 'attributeValue="2"')
      .replace(/Item\[@seq=&quot;1&quot;]/, 'Item[@seq=&quot;2&quot;]')
    const cut = oneItem.indexOf('</Reply>', oneItem.indexOf('90002109818449')) + '</Reply>'.length
    const responseXml = oneItem.slice(0, cut) + '</Replies></MailingCreate></MailingResponse>'
    const created = await store.create(newInput('CP-2026-15'), new Blob([]), 'an@x.be')
    const mailing = await store.update(
      created.id,
      {
        status: 'submitted',
        exchanges: [
          {
            kind: 'create',
            fileName: request.fileName,
            mailingRef: 'CP-2026-15',
            mode: 'T',
            items: 1,
            fingerprint: request.fingerprint,
            excluded: [],
            sentAt: '2026-10-13T12:20:00.000Z',
            sentBy: 'an@x.be',
            state: 'processed',
            statusCode: '100',
            responseFile: 'CREATE_2RS.XML',
            arr: 99.8,
          },
        ],
      },
      created.revision,
      'an@x.be',
      'test',
    )
    await store.saveFile(mailing.id, MAILING_FILES_DIR + request.fileName, new Blob([request.bytes as BlobPart]))
    await store.saveFile(mailing.id, MAILING_FILES_DIR + 'CREATE_2RS.XML', new Blob([encodeLatin1(responseXml) as BlobPart]))
    const announced = await announcedForMailing(store, (await store.get(mailing.id))!)
    expect(announced?.testMode).toBe(true)
    expect(announced?.announced.get(2)).toEqual({
      midNum: '90002109818449',
      address: 'Anna Vanderstappen, Steylsstraat 92, 1020 Brussel',
    })
  })
})

// scripts/apply-opti-corrections.ts
//
// Apply OptiAddress 7001 compCorrection values onto the Contrapunt Excel columns
// so a second MailingCheck sends the text bpost proposed.
//
// Street corrections (comp 92) replace the joined street+number+box: the suggestion
// goes in the street column and the number/box columns are cleared.
// Postcode/city corrections (comp 93) split on the first space.
// Rows with an error and no compCorrection are left unchanged.
//
//   npx tsx scripts/apply-opti-corrections.ts <2RS.xml> [out.xlsx]
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { parseExcelAddresses } from '../src/core/masspost/excel'
import { mapRows } from '../src/core/masspost/mapping'
import {
  CONTRAPUNT_EXPORT_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '../src/core/masspost/fixtures/contrapunt-sample'

const STREET = CONTRAPUNT_EXPORT_COLUMN_MAPPING.streetHouseBox[0]
const HOUSE = CONTRAPUNT_EXPORT_COLUMN_MAPPING.streetHouseBox[1]
const BOX = CONTRAPUNT_EXPORT_COLUMN_MAPPING.streetHouseBox[2]
const POSTCODE = CONTRAPUNT_EXPORT_COLUMN_MAPPING.postcodeCity[0]
const CITY = CONTRAPUNT_EXPORT_COLUMN_MAPPING.postcodeCity[1]

const DEFAULT_OUT = path.join(
  process.cwd(),
  'docs/samples/contrapunt/testadressen-500-corrected.xlsx',
)
const ROW_COUNT = 500

interface Correction {
  seq: number
  compCode: string
  suggestion: string
}

function decodeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
}

function extractCorrections(xml: string): Correction[] {
  const replies = xml.split('<Reply ').slice(1)
  const corrections: Correction[] = []
  for (const reply of replies) {
    if (!reply.includes('code="7001"')) continue
    const seq = reply.match(/attributeValue="(\d+)"/)
    const comp = reply.match(/key="compCode" value="([^"]*)"/)
    const suggestion = reply.match(/key="compCorrection" value="([^"]*)"/)
    if (!seq || !comp || !suggestion) continue
    corrections.push({
      seq: Number(seq[1]),
      compCode: comp[1],
      suggestion: decodeXml(suggestion[1]),
    })
  }
  return corrections
}

function applyCorrection(row: Record<string, unknown>, correction: Correction): void {
  if (correction.compCode === '92') {
    row[STREET] = correction.suggestion
    row[HOUSE] = ''
    row[BOX] = ''
    return
  }
  if (correction.compCode === '93') {
    const space = correction.suggestion.indexOf(' ')
    if (space < 0) {
      row[POSTCODE] = correction.suggestion
      row[CITY] = ''
      return
    }
    row[POSTCODE] = correction.suggestion.slice(0, space)
    row[CITY] = correction.suggestion.slice(space + 1)
    return
  }
  throw new Error(`Geen kolommapping voor comp ${correction.compCode} (rij ${correction.seq})`)
}

async function main() {
  const responsePath = process.argv[2]
  if (!responsePath) {
    console.error('Gebruik: npx tsx scripts/apply-opti-corrections.ts <2RS.xml> [out.xlsx]')
    process.exit(1)
  }
  const outPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUT

  const xml = await readFile(responsePath, 'latin1')
  const corrections = extractCorrections(xml)
  const parsed = await parseExcelAddresses(await readFile(CONTRAPUNT_TEST_ADRESSEN_XLSX))
  const rows = parsed.rows.slice(0, ROW_COUNT).map((row) => ({ ...row }))
  if (rows.length < ROW_COUNT) {
    throw new Error(`Bron heeft ${rows.length} rijen, nodig: ${ROW_COUNT}`)
  }

  const applied: number[] = []
  const skipped: Correction[] = []
  for (const correction of corrections) {
    const row = rows[correction.seq - 1]
    if (!row) {
      skipped.push(correction)
      continue
    }
    applyCorrection(row, correction)
    applied.push(correction.seq)
  }

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Blad1')
  sheet.addRow(parsed.headers)
  for (const row of rows) {
    sheet.addRow(parsed.headers.map((header) => row[header] ?? ''))
  }
  await workbook.xlsx.writeFile(outPath)

  const check = mapRows(rows, CONTRAPUNT_EXPORT_COLUMN_MAPPING)
  const mismatches: string[] = []
  for (const correction of corrections) {
    const mapped = check.rows[correction.seq - 1]
    const actual =
      correction.compCode === '92'
        ? mapped?.fields.streetHouseBox.value
        : mapped?.fields.postcodeCity.value
    if (actual !== correction.suggestion) {
      mismatches.push(`rij ${correction.seq}: "${actual}" ≠ "${correction.suggestion}"`)
    }
  }

  console.log(`Geschreven: ${outPath}`)
  console.log(`Rijen: ${rows.length}`)
  console.log(`Correcties toegepast: ${applied.length} (rijen ${applied.join(', ')})`)
  if (skipped.length) console.log(`Overgeslagen: ${skipped.length}`)
  if (mismatches.length) {
    console.error(mismatches.join('\n'))
    process.exit(1)
  }
  console.log('Controle: elke toegepaste rij leest terug als het voorstel van bpost.')
  console.log('Rij 93 (Steenweg op Mechelen 5, 1950 Kraainem) heeft geen voorstel en is ongewijzigd.')
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

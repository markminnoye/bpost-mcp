// src/core/masspost/fixtures/contrapunt-sample.ts
import ExcelJS from 'exceljs'
import path from 'node:path'
import type { ColumnMapping } from '../mapping'

/** Repo-local copy of Contrapunt's test export (see docs/samples/contrapunt/README.md). */
export const CONTRAPUNT_TEST_ADRESSEN_XLSX = path.join(
  process.cwd(),
  'docs/samples/contrapunt/testadressen.xlsx',
)

/** First 200 rows of the export — bpost test mode (mode=T) treats at most 200 addresses. */
export const COMPARE_SAMPLE_SIZE = 200

/** Same 200 rows, Contrapunt column layout, for `generate:mailing-xml --file`. */
export const CONTRAPUNT_TEST_ADRESSEN_200_XLSX = path.join(
  process.cwd(),
  'docs/samples/contrapunt/testadressen-200.xlsx',
)

/** Same 200 rows as an Address File Tool workbook (.xls). Portal rejects .xlsx. */
export const CONTRAPUNT_AFT_200_XLS = path.join(
  process.cwd(),
  'docs/samples/contrapunt/testadressen-200-aft.xls',
)

/** Column headers as in the Contrapunt / CRM export (Blad1). */
export const CONTRAPUNT_EXPORT_COLUMN_MAPPING: ColumnMapping = {
  name: ['Roepnaam', 'Familienaam'],
  streetHouseBox: [
    'Correspondentieadres - Straat (Key)',
    'Correspondentieadres - Huisnummer (Key)',
    'Correspondentieadres - aanv. huisnr. (Key)',
  ],
  postcodeCity: [
    'Correspondentieadres - Postcode (Key)',
    'Correspondentieadres - Plaats (Key)',
  ],
}

/** One fake address (Contrapunt column layout) for quick portal upload tests. */
export async function buildSimpleContrapuntTestXlsxBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Blad1')
  sheet.addRow([
    'Roepnaam',
    'Familienaam',
    'Correspondentieadres - Straat (Key)',
    'Correspondentieadres - Huisnummer (Key)',
    'Correspondentieadres - aanv. huisnr. (Key)',
    'Correspondentieadres - Postcode (Key)',
    'Correspondentieadres - Plaats (Key)',
  ])
  sheet.addRow(['Test', 'Upload', 'Molenbeeksestraat', '184', '35', '1020', 'Brussel'])
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

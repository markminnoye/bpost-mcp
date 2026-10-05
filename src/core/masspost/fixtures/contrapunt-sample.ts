// src/core/masspost/fixtures/contrapunt-sample.ts
import path from 'node:path'
import type { ColumnMapping } from '../mapping'
import { xlsxBuffer } from './xlsx'

/**
 * Columns of the sample file from Contrapunt (`testadressen.xlsx` and its copies), joined into
 * unstructured Comp 90 / 92 / 93. A fixture for tests and scripts: the app does not recognise this
 * layout, there is no fixed Contrapunt export.
 */
export const CONTRAPUNT_SAMPLE_COLUMN_MAPPING: ColumnMapping = {
  name: ['Roepnaam', 'Familienaam'],
  streetHouseBox: [
    'Correspondentieadres - Straat (Key)',
    'Correspondentieadres - Huisnummer (Key)',
    'Correspondentieadres - aanv. huisnr. (Key)',
  ],
  postcodeCity: ['Correspondentieadres - Postcode (Key)', 'Correspondentieadres - Plaats (Key)'],
}

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

/** One fake address (Contrapunt column layout) for quick portal upload tests. */
export async function buildSimpleContrapuntTestXlsxBuffer(): Promise<Buffer> {
  return xlsxBuffer([
    [
      'Roepnaam',
      'Familienaam',
      'Correspondentieadres - Straat (Key)',
      'Correspondentieadres - Huisnummer (Key)',
      'Correspondentieadres - aanv. huisnr. (Key)',
      'Correspondentieadres - Postcode (Key)',
      'Correspondentieadres - Plaats (Key)',
    ],
    ['Test', 'Upload', 'Molenbeeksestraat', '184', '35', '1020', 'Brussel'],
  ])
}

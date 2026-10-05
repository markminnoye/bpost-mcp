// src/core/masspost/fixtures/contrapunt-sample.ts
import path from 'node:path'
import { xlsxBuffer } from './xlsx'

export { CONTRAPUNT_EXPORT_COLUMN_MAPPING } from '../presets/contrapunt-export'

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

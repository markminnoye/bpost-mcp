// src/core/masspost/aft-export.ts
// Export for bpost's Address File Tool (AFT) on the e-MassPost portal: the template columns, one row
// per address that goes to bpost, in the unstructured blocks (Comp 90-93) that the XML uses too.
// The portal only takes Excel 97-2003 (.xls), never .xlsx. Browser-safe (SheetJS, no Node APIs).
import * as XLSX from 'xlsx'
import { isBelgianCountry, mapRows, type AddressField, type ColumnMapping } from './mapping'
import { AFT_TEMPLATE_COLUMNS } from './presets/aft'

/** AFT column `PRIORITY`: `NP` non-prior (D+2) or `P` prior (D+1). Uppercase, as the portal demands. */
export type AftPriority = 'NP' | 'P'

/** Input for `buildAftExport`. */
export interface AftExportInput {
  /** Rows as read by `parseExcelAddresses`. */
  rows: Record<string, unknown>[]
  /** Spreadsheet row number per row (`ParsedExcel.rowNumbers`). Becomes `SEQ` (web-flow decision 49). */
  rowNumbers: readonly number[]
  mapping: ColumnMapping
  /** Values the user corrected during the format validation, per row number and block. They
   *  replace the value from the mapped columns. */
  corrections?: ReadonlyMap<number, Partial<Record<AddressField, string>>>
  /** Row numbers left out of the mailing: they do not appear in the file. */
  excludedRowNumbers?: ReadonlySet<number>
  /** Default `NP`, as Contrapunt sends today. */
  priority?: AftPriority
}

const BLOCK_COLUMN: Record<Exclude<AddressField, 'country'>, string> = {
  name: 'UNSTRUCTURED_NAME',
  companyDepartment: 'UNSTRUCTURED_COMPANY_DEPARTMENT',
  streetHouseBox: 'UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX',
  postcodeCity: 'UNSTRUCTURED_POST_CODE_CITY',
}

/**
 * Builds the file to upload in the Address File Tool: the 39 template columns in their fixed order
 * (sheet `Sheet0`), with `SEQ`, the unstructured name, company, street and postcode blocks, the
 * country for an address outside Belgium (`ISO_COUNTRY_CODE` for a two-letter code, otherwise
 * `COUNTRY_NAME`) and `PRIORITY`. Excluded rows are left out; corrections replace mapped values.
 * The other columns stay empty: bpost forbids mixing structured and unstructured within one group.
 *
 * @param input Parsed rows with their row numbers, the column mapping, corrections and exclusions.
 * @returns The workbook as Excel 97-2003 (.xls) bytes.
 * @example
 * const bytes = buildAftExport({ rows: parsed.rows, rowNumbers: parsed.rowNumbers, mapping })
 */
export function buildAftExport(input: AftExportInput): Uint8Array {
  const { rows } = mapRows(input.rows, input.mapping, { rowNumbers: input.rowNumbers })
  const priority = input.priority ?? 'NP'
  const table: (string | number | undefined)[][] = [[...AFT_TEMPLATE_COLUMNS]]
  for (const row of rows) {
    if (input.excludedRowNumbers?.has(row.seq)) continue
    const fixed = input.corrections?.get(row.seq) ?? {}
    const value = (field: AddressField) => (fixed[field] ?? row.fields[field]?.value ?? '').trim()
    const record: Record<string, string | number> = { SEQ: row.seq, PRIORITY: priority }
    for (const [field, column] of Object.entries(BLOCK_COLUMN) as [AddressField, string][]) {
      const text = value(field)
      if (text) record[column] = text
    }
    const country = value('country')
    if (country && !isBelgianCountry(country)) {
      if (/^[a-z]{2}$/i.test(country)) record.ISO_COUNTRY_CODE = country.toUpperCase()
      else record.COUNTRY_NAME = country
    }
    table.push(AFT_TEMPLATE_COLUMNS.map((column) => record[column]))
  }
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(table), 'Sheet0')
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'biff8' }) as ArrayBuffer)
}

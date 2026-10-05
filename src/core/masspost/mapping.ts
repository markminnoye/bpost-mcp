// src/core/masspost/mapping.ts
import { findUnsupportedChars, normalizeForBpost } from './charset'

/**
 * Column-to-Comp mapping using bpost's *unstructured* address fields, following the same
 * strategy Contrapunt's own tool already uses in production (see
 * docs/external/contrapunt-aft-converter/README.md, point 1). Comp codes 90-93 are documented
 * in docs/internal/e-masspost/docs/schemas/address-file-tool.md
 * ("Mapping to MailingRequest Schema").
 *
 * No street/house-number splitting is attempted — the user picks which source columns feed
 * each of the three (or four) unstructured blocks, and we join them with a space.
 */
export const UNSTRUCTURED_COMP_CODES = {
  name: '90',
  companyDepartment: '91',
  streetHouseBox: '92',
  postcodeCity: '93',
} as const

/** Unstructured block a source column is mapped onto (`name`, `streetHouseBox`, …). */
export type UnstructuredTarget = keyof typeof UNSTRUCTURED_COMP_CODES

/** Country group (structured, bpost group 5): Comp 17 for an ISO code, Comp 18 for a name.
 *  bpost allows a structured group next to the unstructured ones (mailing-request.md,
 *  "Address Group Rules"). Indispensable for international mail; left out for Belgium. */
export const COUNTRY_COMP_CODES = {
  isoCode: '17',
  name: '18',
} as const

/** Max length of Comp 18 (country name), Table 46. */
export const COUNTRY_NAME_MAX_LENGTH = 42

/** Any block a source column can be mapped onto: the four unstructured blocks and the country. */
export type AddressField = UnstructuredTarget | 'country'

/** Official max length for the unstructured Comp fields (AFT columns U-X). Contrapunt's own
 *  tool used 42 without documented reason — we use the documented limit and report truncation
 *  instead of silently cutting text off. */
export const UNSTRUCTURED_MAX_LENGTH = 50

/** Source-column titles that feed each address block. */
export interface ColumnMapping {
  name: readonly string[]
  companyDepartment?: readonly string[]
  streetHouseBox: readonly string[]
  postcodeCity: readonly string[]
  /** Country name or two-letter code. Sent only for addresses outside Belgium. */
  country?: readonly string[]
}

/** One unstructured field after join, length cap, and character normalization. */
export interface MappedField {
  value: string
  truncated: boolean
  originalLength: number
  /** Characters swapped for an ASCII/Latin-1 equivalent (e.g. ’ → '). */
  replacedChars: string[]
  /** Characters bpost (ISO-8859-1) does not accept and that could not be swapped. */
  unsupportedChars: string[]
}

/** One address after column mapping. `seq` is the spreadsheet row number when given, else 1, 2, 3, … */
export interface MappedRow {
  seq: number
  source: Record<string, unknown>
  fields: {
    name: MappedField
    companyDepartment?: MappedField
    streetHouseBox: MappedField
    postcodeCity: MappedField
    country?: MappedField
  }
}

/** A truncation, empty required field, or character issue on one row. */
export interface MappingWarning {
  seq: number
  field: AddressField
  message: string
}

/** Extra row information for `mapRows`. */
export interface MapRowsOptions {
  /** Spreadsheet row number per row (`ParsedExcel.rowNumbers`). Becomes `seq`, so the number
   *  bpost sends back points at the same row, even when rows are left out (web-flow decision 49). */
  rowNumbers?: readonly number[]
}

const BELGIUM = new Set(['belgie', 'belgique', 'belgien', 'belgium', 'be'])

/**
 * True when the country value means Belgium (België, Belgique, Belgien, Belgium or BE, any case).
 * A Belgian address is sent without a country, as before the country was supported.
 *
 * @param value Country as written in the source column.
 * @returns `true` for Belgium, `false` for anything else, including an empty value.
 * @example
 * isBelgianCountry('België') // true
 */
export function isBelgianCountry(value: string): boolean {
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  return BELGIUM.has(key)
}

/** Mapped rows plus every warning. Rows are not dropped because of a warning. */
export interface MappingResult {
  rows: MappedRow[]
  warnings: MappingWarning[]
}

/** Joins the non-empty, trimmed values of `columns` with a space, in the given order.
 *
 * @param row One record keyed by the Excel header.
 * @param columns Source columns of one unstructured block.
 * @returns The raw block value, before any character fix or length cap.
 * @example
 * joinColumns({ Postcode: 9340, Gemeente: 'Lede' }, ['Postcode', 'Gemeente']) // '9340 Lede'
 */
export function joinColumns(row: Record<string, unknown>, columns: readonly string[]): string {
  return columns
    .map((c) => String(row[c] ?? '').trim())
    .filter((v) => v !== '')
    .join(' ')
}

function sanitize(raw: string, maxLength = UNSTRUCTURED_MAX_LENGTH): MappedField {
  // AFT/Comp values must not contain the field separator or line breaks.
  let cleaned = raw.replace(/\|/g, '')
  cleaned = cleaned.replace(/[\r\n]+/g, ' ').trim()
  // bpost accepts ISO-8859-1 only: swap typographic characters, report what could not be fixed.
  const normalized = normalizeForBpost(cleaned)
  cleaned = normalized.text
  const originalLength = cleaned.length
  const value = cleaned.slice(0, maxLength)
  return {
    value,
    truncated: value.length < originalLength,
    originalLength,
    replacedChars: normalized.replaced,
    unsupportedChars: findUnsupportedChars(value),
  }
}

/** Maps parsed Excel rows onto the unstructured Comp fields (and the country), reporting every
 *  truncation and every empty required field instead of silently accepting or cutting them.
 *
 * @param rows Records keyed by the Excel header, as returned by `parseExcelAddresses`.
 * @param mapping Source columns for the name, street, postcode and optional company and country blocks.
 * @param options `rowNumbers` makes `seq` the spreadsheet row number. Without it, `seq` is 1, 2, 3, …
 * @returns Mapped rows and warnings, in input order.
 * @example
 * const { rows, warnings } = mapRows(parsed.rows, {
 *   name: ['Naam'],
 *   streetHouseBox: ['Straat'],
 *   postcodeCity: ['Postcode', 'Gemeente'],
 * }, { rowNumbers: parsed.rowNumbers })
 */
export function mapRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  options: MapRowsOptions = {},
): MappingResult {
  const mappedRows: MappedRow[] = []
  const warnings: MappingWarning[] = []

  rows.forEach((row, idx) => {
    const seq = options.rowNumbers?.[idx] ?? idx + 1
    const name = sanitize(joinColumns(row, mapping.name))
    const streetHouseBox = sanitize(joinColumns(row, mapping.streetHouseBox))
    const postcodeCity = sanitize(joinColumns(row, mapping.postcodeCity))
    const companyDepartment = mapping.companyDepartment?.length
      ? sanitize(joinColumns(row, mapping.companyDepartment))
      : undefined
    const country = mapping.country?.length
      ? sanitize(joinColumns(row, mapping.country), COUNTRY_NAME_MAX_LENGTH)
      : undefined

    const checked: [AddressField, MappedField | undefined, string, boolean, number][] = [
      ['name', name, 'Naam', true, UNSTRUCTURED_MAX_LENGTH],
      ['streetHouseBox', streetHouseBox, 'Straat + nummer', true, UNSTRUCTURED_MAX_LENGTH],
      ['postcodeCity', postcodeCity, 'Postcode + stad', true, UNSTRUCTURED_MAX_LENGTH],
      ['country', country, 'Land', false, COUNTRY_NAME_MAX_LENGTH],
    ]
    for (const [field, mapped, label, required, maxLength] of checked) {
      if (!mapped) continue
      if (mapped.truncated) {
        warnings.push({
          seq,
          field,
          message: `${label} ingekort van ${mapped.originalLength} naar ${maxLength} tekens: "${mapped.value}"`,
        })
      }
      if (required && !mapped.value) {
        warnings.push({ seq, field, message: `${label} is leeg.` })
      }
      if (mapped.replacedChars.length) {
        warnings.push({
          seq,
          field,
          message: `${label}: tekens vervangen door een gewoon teken (bpost aanvaardt enkel ISO-8859-1): ${mapped.replacedChars.join(' ')}`,
        })
      }
      if (mapped.unsupportedChars.length) {
        warnings.push({
          seq,
          field,
          message: `${label}: teken(s) dat bpost niet aanvaardt, pas het adres aan: ${mapped.unsupportedChars.join(' ')}`,
        })
      }
    }

    mappedRows.push({
      seq,
      source: row,
      fields: { name, companyDepartment, streetHouseBox, postcodeCity, ...(country ? { country } : {}) },
    })
  })

  return { rows: mappedRows, warnings }
}

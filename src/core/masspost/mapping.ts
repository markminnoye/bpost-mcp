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

export type UnstructuredTarget = keyof typeof UNSTRUCTURED_COMP_CODES

/** Official max length for the unstructured Comp fields (AFT columns U-X). Contrapunt's own
 *  tool used 42 without documented reason — we use the documented limit and report truncation
 *  instead of silently cutting text off. */
export const UNSTRUCTURED_MAX_LENGTH = 50

export interface ColumnMapping {
  name: readonly string[]
  companyDepartment?: readonly string[]
  streetHouseBox: readonly string[]
  postcodeCity: readonly string[]
}

export interface MappedField {
  value: string
  truncated: boolean
  originalLength: number
  /** Characters swapped for an ASCII/Latin-1 equivalent (e.g. ’ → '). */
  replacedChars: string[]
  /** Characters bpost (ISO-8859-1) does not accept and that could not be swapped. */
  unsupportedChars: string[]
}

export interface MappedRow {
  seq: number
  source: Record<string, unknown>
  fields: {
    name: MappedField
    companyDepartment?: MappedField
    streetHouseBox: MappedField
    postcodeCity: MappedField
  }
}

export interface MappingWarning {
  seq: number
  field: UnstructuredTarget
  message: string
}

export interface MappingResult {
  rows: MappedRow[]
  warnings: MappingWarning[]
}

function joinColumns(row: Record<string, unknown>, columns: readonly string[]): string {
  return columns
    .map((c) => String(row[c] ?? '').trim())
    .filter((v) => v !== '')
    .join(' ')
}

function sanitize(raw: string): MappedField {
  // AFT/Comp values must not contain the field separator or line breaks.
  let cleaned = raw.replace(/\|/g, '')
  cleaned = cleaned.replace(/[\r\n]+/g, ' ').trim()
  // bpost accepts ISO-8859-1 only: swap typographic characters, report what could not be fixed.
  const normalized = normalizeForBpost(cleaned)
  cleaned = normalized.text
  const originalLength = cleaned.length
  const value = cleaned.slice(0, UNSTRUCTURED_MAX_LENGTH)
  return {
    value,
    truncated: value.length < originalLength,
    originalLength,
    replacedChars: normalized.replaced,
    unsupportedChars: findUnsupportedChars(value),
  }
}

/** Maps parsed Excel rows onto the unstructured Comp fields, reporting every truncation and
 *  every empty required field instead of silently accepting or cutting them. */
export function mapRows(rows: Record<string, unknown>[], mapping: ColumnMapping): MappingResult {
  const mappedRows: MappedRow[] = []
  const warnings: MappingWarning[] = []

  rows.forEach((row, idx) => {
    const seq = idx + 1
    const name = sanitize(joinColumns(row, mapping.name))
    const streetHouseBox = sanitize(joinColumns(row, mapping.streetHouseBox))
    const postcodeCity = sanitize(joinColumns(row, mapping.postcodeCity))
    const companyDepartment = mapping.companyDepartment?.length
      ? sanitize(joinColumns(row, mapping.companyDepartment))
      : undefined

    const required: [UnstructuredTarget, MappedField, string][] = [
      ['name', name, 'Naam'],
      ['streetHouseBox', streetHouseBox, 'Straat + nummer'],
      ['postcodeCity', postcodeCity, 'Postcode + stad'],
    ]
    for (const [field, mapped, label] of required) {
      if (mapped.truncated) {
        warnings.push({
          seq,
          field,
          message: `${label} ingekort van ${mapped.originalLength} naar ${UNSTRUCTURED_MAX_LENGTH} tekens: "${mapped.value}"`,
        })
      }
      if (!mapped.value) {
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
      fields: { name, companyDepartment, streetHouseBox, postcodeCity },
    })
  })

  return { rows: mappedRows, warnings }
}

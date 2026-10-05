// src/core/masspost/format-check.ts
// Format rules for the unstructured address blocks (Comp 90-93) and the country (17/18), checked per field before a
// MailingCheck. Unlike `mapRows`, nothing is fixed silently: every problem comes back with the raw
// value and, when a safe one exists, a proposal for the user to confirm (web-flow design, decision 19).
// Sources: docs/internal/e-masspost/docs/schemas/mailing-request.md (Table 46, Address Group Rules)
// and address-file-tool.md (columns U-X). The customer-facing list of these rules is
// docs/documentatie/webapp/formaatvalidatie.md. Pure and browser-safe: imports only charset and mapping.
import { findUnsupportedChars, normalizeForBpost } from './charset'
import {
  COUNTRY_NAME_MAX_LENGTH,
  UNSTRUCTURED_MAX_LENGTH,
  joinColumns,
  type AddressField,
  type ColumnMapping,
  type UnstructuredTarget,
} from './mapping'

/** Why a field value fails, in the order the rules are checked. */
export type FormatIssueKind = 'empty' | 'charset' | 'slash' | 'tooLong'

/** Outcome of `checkFieldValue`. `message` is customer-facing (Flemish). */
export type FieldCheck = { ok: true } | { ok: false; kind: FormatIssueKind; message: string }

/** Blocks that must have a value. 92 and 93 are the basis of a Belgian address (bpost groups 3
 *  and 4); the name is our own rule, as in `mapRows`. The company block (91) is optional. */
export const REQUIRED_FIELDS: readonly UnstructuredTarget[] = ['name', 'streetHouseBox', 'postcodeCity']

/** Blocks where bpost forbids `/` as a separator (address-file-tool.md, columns W and X). */
const NO_SLASH_FIELDS: readonly AddressField[] = ['streetHouseBox', 'postcodeCity']

/** Maximum length per block: 50 for Comp 90-93, 42 for the country name (Table 46). */
function maxLengthOf(field: AddressField): number {
  return field === 'country' ? COUNTRY_NAME_MAX_LENGTH : UNSTRUCTURED_MAX_LENGTH
}

/** One whole-word abbreviation, used only in the listed blocks. */
export interface Abbreviation {
  full: string
  short: string
  fields: readonly UnstructuredTarget[]
}

/**
 * Abbreviations tried, in this order, when a value is longer than 50 characters. Never applied to
 * the postcode and municipality (a municipality such as Sint-Niklaas must stay intact). Scoped per
 * block so that, for example, the family name "De Koning" is not shortened.
 */
export const ABBREVIATIONS: readonly Abbreviation[] = [
  { full: 'Burgemeester', short: 'Burg.', fields: ['streetHouseBox'] },
  { full: 'Sint', short: 'St.', fields: ['streetHouseBox'] },
  { full: 'Koningin', short: 'Kon.', fields: ['streetHouseBox'] },
  { full: 'Koning', short: 'Kon.', fields: ['streetHouseBox'] },
  { full: 'Generaal', short: 'Gen.', fields: ['streetHouseBox'] },
  { full: 'Avenue', short: 'Av.', fields: ['streetHouseBox'] },
  { full: 'Boulevard', short: 'Bd', fields: ['streetHouseBox'] },
  { full: 'Dokter', short: 'Dr.', fields: ['streetHouseBox', 'name'] },
  { full: 'Professor', short: 'Prof.', fields: ['streetHouseBox', 'name'] },
  { full: 'Monseigneur', short: 'Mgr.', fields: ['streetHouseBox', 'name'] },
  { full: 'Vereniging', short: 'Ver.', fields: ['name', 'companyDepartment'] },
  { full: 'Familie', short: 'Fam.', fields: ['name'] },
]

const FORBIDDEN_IN_ADDRESS = /[|\t\r\n]/

function lengthOf(value: string): number {
  return [...value].length
}

function charsetMessage(value: string): string | undefined {
  const forbidden = FORBIDDEN_IN_ADDRESS.exec(value)?.[0]
  if (forbidden === '|') return 'Het teken "|" mag niet in een adres.'
  if (forbidden === '\t') return 'Bevat een tab. Die mag niet in een adres.'
  if (forbidden) return 'Bevat een regeleinde. Dat mag niet in een adres.'
  const [unsupported] = findUnsupportedChars(value)
  return unsupported ? `Het teken "${unsupported}" kent bpost niet.` : undefined
}

/**
 * Checks one block value against the bpost format rules: required, character set (ISO-8859-1,
 * no `|`, tab or line break), no `/` in the street and postcode blocks, at most 50 characters
 * (42 for the country, which is optional).
 * Leading and trailing spaces are ignored. Returns the first rule that fails.
 *
 * @param value Current value of the block (raw or edited by the user).
 * @param field Unstructured block the value is sent in.
 * @returns `{ ok: true }`, or the failing rule with a customer-facing message.
 * @example
 * checkFieldValue('Kerkstraat 12/3', 'streetHouseBox')
 * // { ok: false, kind: 'slash', message: 'Gebruik geen schuine streep (/). …' }
 */
export function checkFieldValue(value: string, field: AddressField): FieldCheck {
  const text = value.trim()
  if (!text) {
    return (REQUIRED_FIELDS as readonly AddressField[]).includes(field)
      ? { ok: false, kind: 'empty', message: 'Verplicht veld is leeg.' }
      : { ok: true }
  }
  const charset = charsetMessage(text)
  if (charset) return { ok: false, kind: 'charset', message: charset }
  if (NO_SLASH_FIELDS.includes(field) && text.includes('/')) {
    return {
      ok: false,
      kind: 'slash',
      message:
        field === 'streetHouseBox'
          ? 'Gebruik geen schuine streep (/). Schrijf bijvoorbeeld "12 bus 3".'
          : 'Gebruik geen schuine streep (/) tussen postcode en gemeente.',
    }
  }
  const length = lengthOf(text)
  const max = maxLengthOf(field)
  if (length > max) {
    return { ok: false, kind: 'tooLong', message: `Te lang: ${length} van maximaal ${max} tekens.` }
  }
  return { ok: true }
}

function matchCase(short: string, found: string): string {
  if (found === found.toUpperCase()) return short.toUpperCase()
  if (found[0] === found[0].toLowerCase()) return short[0].toLowerCase() + short.slice(1)
  return short
}

function abbreviate(text: string, field: AddressField): string {
  let out = text
  for (const { full, short, fields } of ABBREVIATIONS) {
    if (lengthOf(out) <= UNSTRUCTURED_MAX_LENGTH) break
    if (!(fields as readonly AddressField[]).includes(field)) continue
    const word = new RegExp(`(?<!\\p{L})${full}(?!\\p{L})`, 'giu')
    out = out.replace(word, (found) => matchCase(short, found))
  }
  return out
}

/**
 * Proposes a value that passes `checkFieldValue`. Removes `|`, tabs and line breaks, swaps
 * characters via `normalizeForBpost`, collapses spaces, writes `12/3` as `12 bus 3` in the street
 * block, and abbreviates (`ABBREVIATIONS`) when the value is too long. The proposal is for the user
 * to confirm; nothing is applied here.
 *
 * @param value Current value of the block.
 * @param field Unstructured block the value is sent in.
 * @returns The proposal, or `undefined` when no safe fix exists or the value is already fine.
 * @example
 * proposeFieldValue('Jan ’t Hooft', 'name') // "Jan 't Hooft"
 */
export function proposeFieldValue(value: string, field: AddressField): string | undefined {
  let text = value.replace(/[|\t\r\n]+/g, ' ')
  text = normalizeForBpost(text).text
  if (field === 'streetHouseBox') {
    text = text.replace(/(\d+[A-Za-z]?)\s*\/\s*([A-Za-z0-9]+)/g, '$1 bus $2')
  }
  if (NO_SLASH_FIELDS.includes(field)) text = text.replace(/\//g, ' ')
  text = text.replace(/ {2,}/g, ' ').trim()
  if (field !== 'postcodeCity' && field !== 'country') text = abbreviate(text, field)

  if (!text || text === value.trim()) return undefined
  return checkFieldValue(text, field).ok ? text : undefined
}

/** One block of one row that fails a format rule. */
export interface FormatIssue {
  /** The number sent to bpost for this row, as in `mapRows`: the row number when given, else 1, 2, 3, … */
  seq: number
  /** Row number in the spreadsheet, for the user to find the address. */
  rowNumber: number
  field: AddressField
  kind: FormatIssueKind
  message: string
  /** Raw joined value, before any fix. */
  original: string
  proposal?: string
  /** Raw values of every mapped block of this row, to show the whole address. */
  fields: Partial<Record<AddressField, string>>
  /** Non-empty values of the context columns of this row. */
  context: Record<string, string>
}

/** Extra row information for `findFormatIssues`. */
export interface FindFormatIssuesOptions {
  /** Spreadsheet row number per row (`ParsedExcel.rowNumbers`). Default: index + 2. */
  rowNumbers?: readonly number[]
  /** Columns shown next to a problem to help the user correct it. */
  contextColumns?: readonly string[]
}

const FIELD_ORDER: readonly AddressField[] = ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country']

/**
 * Checks every mapped block of every row and returns the problems, with a proposal where one is
 * safe. Unmapped blocks are skipped; use `missingTargets` for required blocks without a column.
 *
 * @param rows Records keyed by the Excel header (`ParsedExcel.rows`).
 * @param mapping Source columns per unstructured block.
 * @param options Spreadsheet row numbers and context columns.
 * @returns Problems ordered by row, then by block (90, 91, 92, 93, country).
 * @example
 * const issues = findFormatIssues(parsed.rows, mapping, { rowNumbers: parsed.rowNumbers })
 */
export function findFormatIssues(
  rows: readonly Record<string, unknown>[],
  mapping: ColumnMapping,
  options: FindFormatIssuesOptions = {},
): FormatIssue[] {
  const fieldsInUse = FIELD_ORDER.filter((field) => (mapping[field]?.length ?? 0) > 0)
  const contextColumns = options.contextColumns ?? []
  const issues: FormatIssue[] = []

  rows.forEach((row, idx) => {
    const fields: Partial<Record<AddressField, string>> = Object.fromEntries(
      fieldsInUse.map((field) => [field, joinColumns(row, mapping[field] ?? [])]),
    )
    let context: Record<string, string> | undefined
    for (const field of fieldsInUse) {
      const original = fields[field] ?? ''
      const check = checkFieldValue(original, field)
      if (check.ok) continue
      context ??= Object.fromEntries(
        contextColumns
          .map((column): [string, string] => [column, String(row[column] ?? '').trim()])
          .filter(([, value]) => value !== ''),
      )
      issues.push({
        seq: options.rowNumbers?.[idx] ?? idx + 1,
        rowNumber: options.rowNumbers?.[idx] ?? idx + 2,
        field,
        kind: check.kind,
        message: check.message,
        original,
        proposal: proposeFieldValue(original, field),
        fields,
        context,
      })
    }
  })
  return issues
}

/**
 * Required blocks without a source column: the check on the mapped columns.
 *
 * @param mapping Column mapping chosen by the user.
 * @returns Required blocks (`REQUIRED_FIELDS`) that have no column. Empty when the mapping is complete.
 * @example
 * missingTargets({ name: ['Naam'], streetHouseBox: [], postcodeCity: ['Postcode'] }) // ['streetHouseBox']
 */
export function missingTargets(mapping: ColumnMapping): UnstructuredTarget[] {
  return REQUIRED_FIELDS.filter((field) => (mapping[field]?.length ?? 0) === 0)
}

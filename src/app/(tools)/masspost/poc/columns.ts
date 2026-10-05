// Column roles, envelope examples and column profiles for the mapping step.
// Browser-safe: deep imports only, never the masspost barrel.
import { isBelgianCountry, joinColumns, type AddressField, type ColumnMapping } from '@/core/masspost/mapping'
import type { MappingPresetId, SuggestColumnMappingResult } from '@/core/masspost/suggest-mapping'

/** What one Excel column is used for: an address block, context while correcting, or nothing. */
export type ColumnRole = AddressField | 'context' | 'ignore'

/** An address list read from Excel (or the built-in sample list). */
export interface LoadedList {
  fileName: string
  headers: string[]
  rows: Record<string, unknown>[]
  rowNumbers: number[]
}

export const ROLE_OPTIONS: readonly { value: ColumnRole; label: string }[] = [
  { value: 'name', label: 'Naam' },
  { value: 'companyDepartment', label: 'Bedrijf of afdeling' },
  { value: 'streetHouseBox', label: 'Straat, nummer en bus' },
  { value: 'postcodeCity', label: 'Postcode en gemeente' },
  { value: 'country', label: 'Land' },
  { value: 'context', label: 'Tonen bij het verbeteren' },
  { value: 'ignore', label: 'Niet gebruiken' },
]

/** Label of an address block in sentences ("Rij 14 · naam") and in the row context ("Naam: …"). */
export const FIELD_LABELS: Record<AddressField, { short: string; title: string }> = {
  name: { short: 'naam', title: 'Naam' },
  companyDepartment: { short: 'bedrijf of afdeling', title: 'Bedrijf of afdeling' },
  streetHouseBox: { short: 'straat', title: 'Straat' },
  postcodeCity: { short: 'postcode en gemeente', title: 'Postcode en gemeente' },
  country: { short: 'land', title: 'Land' },
}

/** Address blocks in envelope order. */
export const ADDRESS_FIELDS: readonly AddressField[] = ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country']

const REQUIRED: readonly AddressField[] = ['name', 'streetHouseBox', 'postcodeCity']

/**
 * Role per column from the suggestion. A column without a match is shown while correcting
 * (decision 28); in a known layout it is not used, because those files hold the same address
 * in other columns too (the AFT has structured and unstructured columns side by side).
 */
export function initialRoles(headers: readonly string[], suggestion: SuggestColumnMappingResult): Record<string, ColumnRole> {
  const roles: Record<string, ColumnRole> = {}
  const unmatched: ColumnRole = suggestion.preset === 'aft' ? 'ignore' : 'context'
  for (const header of headers) roles[header] = header === 'SEQ' ? 'context' : unmatched
  for (const field of ADDRESS_FIELDS) {
    for (const column of suggestion.mapping[field] ?? []) roles[column] = field
  }
  return roles
}

/** Column mapping in the chosen order (`columnOrder`), plus the context columns. */
export function rolesToMapping(
  columnOrder: readonly string[],
  roles: Record<string, ColumnRole>,
): { mapping: ColumnMapping; contextColumns: string[] } {
  const pick = (role: ColumnRole) => columnOrder.filter((header) => roles[header] === role)
  return {
    mapping: {
      name: pick('name'),
      companyDepartment: pick('companyDepartment'),
      streetHouseBox: pick('streetHouseBox'),
      postcodeCity: pick('postcodeCity'),
      country: pick('country'),
    },
    contextColumns: pick('context'),
  }
}

/** Moves `column` one place left or right among the columns of the same block. */
export function moveInBlock(
  columnOrder: readonly string[],
  roles: Record<string, ColumnRole>,
  column: string,
  direction: -1 | 1,
): string[] {
  const sameBlock = columnOrder.filter((header) => roles[header] === roles[column])
  const neighbour = sameBlock[sameBlock.indexOf(column) + direction]
  if (!neighbour) return [...columnOrder]
  const order = [...columnOrder]
  const a = order.indexOf(column)
  const b = order.indexOf(neighbour)
  ;[order[a], order[b]] = [order[b], order[a]]
  return order
}

/** True when name, street and postcode each have a value somewhere in the first rows. */
export function requiredBlocksHaveData(list: LoadedList, mapping: ColumnMapping, scan = 200): boolean {
  const rows = list.rows.slice(0, scan)
  return REQUIRED.every((field) => rows.some((row) => joinColumns(row, mapping[field] ?? []) !== ''))
}

/** Number of addresses outside Belgium (a country is mapped and filled in). */
export function countForeign(list: LoadedList, mapping: ColumnMapping): number {
  if (!mapping.country?.length) return 0
  let count = 0
  for (const row of list.rows) {
    const country = joinColumns(row, mapping.country)
    if (country && !isBelgianCountry(country)) count++
  }
  return count
}

/** Kinds of address for the envelope examples, from simple to complex. */
export type AddressKind = 'simple' | 'box' | 'company' | 'foreign' | 'long' | 'incomplete'

export const ADDRESS_KINDS: readonly { id: AddressKind; label: string; tip: string }[] = [
  { id: 'simple', label: 'Eenvoudig', tip: 'Naam, straat en postcode, zonder bus, bedrijf of buitenland.' },
  { id: 'box', label: 'Met bus of bijvoegsel', tip: 'Een busnummer, een letter bij het huisnummer of een schuine streep.' },
  { id: 'company', label: 'Met bedrijf of afdeling', tip: 'Het vak bedrijf of afdeling is ingevuld.' },
  { id: 'foreign', label: 'Buitenland', tip: 'Een land buiten België.' },
  { id: 'long', label: 'Lang', tip: 'Een vak van meer dan 45 tekens: bijna of over de grens van 50.' },
  { id: 'incomplete', label: 'Onvolledig', tip: 'Naam, straat of postcode is leeg.' },
]

const BOX = /\b(bus|bte|boîte|boite|box|app|apt)\b|\d\s*[a-z]\b|\d\s*\/\s*\w/i

/**
 * Row indices per kind of address, over the first `scan` rows. A row can belong to several kinds;
 * "simple" is what belongs to none of the others.
 */
export function addressKinds(list: LoadedList, mapping: ColumnMapping, scan = 20_000): Record<AddressKind, number[]> {
  const kinds: Record<AddressKind, number[]> = { simple: [], box: [], company: [], foreign: [], long: [], incomplete: [] }
  const limit = Math.min(list.rows.length, scan)
  for (let i = 0; i < limit; i++) {
    const row = list.rows[i]
    const value = (field: AddressField) => joinColumns(row, mapping[field] ?? [])
    const name = value('name')
    const street = value('streetHouseBox')
    const postcode = value('postcodeCity')
    const company = value('companyDepartment')
    const country = value('country')
    let other = false
    const add = (kind: AddressKind) => {
      kinds[kind].push(i)
      other = true
    }
    if (!name || !street || !postcode) add('incomplete')
    if ([name, street, postcode, company].some((v) => v.length > 45)) add('long')
    if (country && !isBelgianCountry(country)) add('foreign')
    if (company) add('company')
    if (BOX.test(street)) add('box')
    if (!other) kinds.simple.push(i)
  }
  return kinds
}

/** Per column, in how many rows it has a value (over all rows). */
export function columnFillCounts(list: LoadedList): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(list.headers.map((header) => [header, 0]))
  for (const row of list.rows) {
    for (const header of list.headers) {
      if (String(row[header] ?? '').trim() !== '') counts[header]++
    }
  }
  return counts
}

/** What a column holds: how often it is filled, how varied, how long, and up to 20 values. */
export interface ColumnProfile {
  filled: number
  total: number
  distinct: number
  longest: string
  values: string[]
}

export function columnProfile(list: LoadedList, header: string, count = 20): ColumnProfile {
  const seen = new Set<string>()
  const values: string[] = []
  let filled = 0
  let longest = ''
  for (const row of list.rows) {
    const value = String(row[header] ?? '').trim()
    if (!value) continue
    filled++
    if (value.length > longest.length) longest = value
    if (!seen.has(value)) {
      seen.add(value)
      if (values.length < count) values.push(value)
    }
  }
  return { filled, total: list.rows.length, distinct: seen.size, longest, values }
}

/** Up to `count` distinct, non-empty values per column, from the first `scanLimit` rows. */
export function columnExamples(list: LoadedList, count = 5, scanLimit = 5000): Record<string, string[]> {
  const examples: Record<string, string[]> = Object.fromEntries(list.headers.map((h) => [h, []]))
  const seen: Record<string, Set<string>> = Object.fromEntries(list.headers.map((h) => [h, new Set()]))
  const limit = Math.min(list.rows.length, scanLimit)
  for (let i = 0; i < limit; i++) {
    let complete = true
    for (const header of list.headers) {
      if (examples[header].length >= count) continue
      complete = false
      const value = String(list.rows[i][header] ?? '').trim()
      if (value && !seen[header].has(value)) {
        seen[header].add(value)
        examples[header].push(value)
      }
    }
    if (complete) break
  }
  return examples
}

/** Short name and explanation of a recognised layout, for its pill. */
export const PRESET_LABELS: Record<MappingPresetId, { label: string; tip: string }> = {
  aft: { label: 'AFT', tip: 'AFT: kolommen volgens de Address File Tool van bpost, automatisch gekoppeld.' },
}

/** A short label for a long column title: the part after the last " - ", without a trailing
 *  "(…)". "Correspondentieadres - Straat (Key)" becomes "Straat". The full title stays in the tooltip. */
export function shortColumnName(header: string): string {
  const short = header.split(' - ').pop()!.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return short || header
}

/** "1.234" in Flemish notation. */
export function formatCount(n: number): string {
  return n.toLocaleString('nl-BE')
}

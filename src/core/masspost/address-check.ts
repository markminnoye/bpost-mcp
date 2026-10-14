// src/core/masspost/address-check.ts
// The result of an address check (MailingCheck) as step 4 shows it (sketch adrescontrole.html,
// decisions 37-41 of 02/10): groups, proposals in the user's writing, open rows and the estimate.
import type { AddressField } from './mapping'
import { isCorrectionCode, type ItemResult, type MailingResult, type SuggestionSource } from './parse-response'

/** Group of a row in step 4. */
export type CheckGroupId = 'noAddress' | 'multiple' | 'proposal' | 'note' | 'ok'

/** The groups in screen order, with their title. */
export const CHECK_GROUPS: readonly { id: CheckGroupId; title: string }[] = [
  { id: 'noAddress', title: 'Geen adres gevonden' },
  { id: 'multiple', title: 'Meerdere adressen gevonden' },
  { id: 'proposal', title: 'Voorstel van e-MassPost' },
  { id: 'note', title: 'Opmerking zonder voorstel' },
  { id: 'ok', title: 'In orde' },
]

/** One option of the list under an address field: the address and where it comes from. */
export interface AddressOption {
  value: string
  source: SuggestionSource
}

/**
 * One row of step 4. `field` is `address` for an address bpost did not find (or found several
 * times): one field "straat en nummer, postcode en gemeente", split into Comp 92 and 93 (decision 41).
 */
export interface CheckRow {
  /** `<seq>:<field>`, unique on the screen. */
  key: string
  seq: number
  group: CheckGroupId
  field: 'address' | AddressField
  sent: Partial<Record<AddressField, string>>
  /** The value as sent. */
  original: string
  /** The proposal of bpost, in the user's writing. */
  proposal?: string
  options: AddressOption[]
  /** Explanation for a row without a proposal. */
  note?: string
  /**
   * The values of the address before any correction (the mapped Excel row). A correction clears only
   * when the value returns to these; without them, what was sent counts as the starting point.
   */
  base?: Partial<Record<AddressField, string>>
  codes: string[]
}

/** Rows, number of addresses per group, and codes this app does not know. */
export interface CheckView {
  rows: CheckRow[]
  counts: Record<CheckGroupId, number>
  unknownCodes: string[]
}

const KNOWN = new Set(['MID-4000', 'MID-4010', 'MID-4020', 'MID-4030', 'MID-4040', 'MID-4050', 'MID-4060', 'MID-4070', 'MID-4080', 'MID-4090', '7001', 'MID-7001'])
const NOT_FOUND = new Set(['MID-4010', 'MID-4070', 'MID-4080'])
const NOTES: Record<string, string> = {
  'MID-4000': 'Een deel van het adres klopt niet volgens e-MassPost. Optioneel nakijken.',
  'MID-4050': 'Ronde gevonden, maar geen afgiftepunt. Optioneel nakijken.',
  'MID-4060': 'Gebouw gevonden, maar geen perfecte match. Optioneel nakijken.',
  'MID-4090': 'Straat gevonden, maar geen ronde. Optioneel nakijken.',
}
const LOWER = new Set(['bus', 'b', 'bte', 'boite', 'boîte'])
const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

/**
 * Whether two texts differ only in capitals and spaces: bpost writes everything in capitals.
 * @param a One text.
 * @param b The other.
 * @returns True when they are the same apart from capitals.
 */
export function sameButCase(a: string, b: string): boolean {
  return norm(a).toLocaleUpperCase('nl') === norm(b).toLocaleUpperCase('nl')
}

/**
 * A correction of bpost in the writing of the user: words the user wrote keep the user's form, new
 * words get a capital (the box word `bus` stays small). When the user writes in capitals, so does
 * the result.
 * @param correction The correction of bpost (capitals).
 * @param sent What the user sent.
 * @returns The proposal.
 * @example inUserCase('MOLENBEEKSESTRAAT 184 BUS 35', 'Molenbeeksestraat 184 35') // 'Molenbeeksestraat 184 bus 35'
 */
export function inUserCase(correction: string, sent: string): string {
  const own = norm(sent).split(' ')
  if (own.join(' ') === own.join(' ').toLocaleUpperCase('nl')) return norm(correction)
  const used = new Set<number>()
  return norm(correction)
    .split(' ')
    .map((word) => {
      const i = own.findIndex((w, j) => !used.has(j) && w.toLocaleUpperCase('nl') === word.toLocaleUpperCase('nl'))
      if (i >= 0) {
        used.add(i)
        return own[i]
      }
      const lower = word.toLocaleLowerCase('nl')
      if (LOWER.has(lower)) return lower
      return lower.replace(/^\p{L}/u, (c) => c.toLocaleUpperCase('nl'))
    })
    .join(' ')
}

/**
 * Splits "straat en nummer, postcode en gemeente" into Comp 92 and 93: on the last comma, or before the
 * last postcode of four digits followed by a place name. A house or box number of four digits stays
 * with the street.
 * @param text What the user typed or chose.
 * @returns Both parts, or null when there is no postcode.
 * @example splitAddress('Kerkstraat 1234 9300 Aalst') // { streetHouseBox: 'Kerkstraat 1234', postcodeCity: '9300 Aalst' }
 */
export function splitAddress(text: string): { streetHouseBox: string; postcodeCity: string } | null {
  const t = norm(text)
  const comma = t.lastIndexOf(',')
  if (comma > 0) {
    const streetHouseBox = t.slice(0, comma).trim()
    const postcodeCity = t.slice(comma + 1).trim()
    return /^\d{4} \S/.test(postcodeCity) && streetHouseBox ? { streetHouseBox, postcodeCity } : null
  }
  const m = /^(.*) (\d{4} \p{L}.*)$/u.exec(t)
  return m?.[1] ? { streetHouseBox: m[1], postcodeCity: m[2] } : null
}

/**
 * Street and postcode as one text, for the address field.
 * @param sent The address fields.
 * @returns "Kerkstraat 1, 9300 Aalst".
 */
export function joinAddress(sent: Partial<Record<AddressField, string>>): string {
  return [sent.streetHouseBox ?? '', sent.postcodeCity ?? ''].filter(Boolean).join(', ')
}

function rowsOf(item: ItemResult): Omit<CheckRow, 'key'>[] {
  const codes = item.messages.map((m) => m.code)
  const base = { seq: item.seq, sent: item.sent, codes }
  const address = { field: 'address' as const, original: joinAddress(item.sent) }
  if (codes.some((c) => NOT_FOUND.has(c))) return [{ ...base, ...address, group: 'noAddress', options: [] }]
  if (codes.includes('MID-4020')) {
    const options = item.candidates.map((c) => ({
      value: inUserCase(joinAddress(c), joinAddress(item.sent)),
      source: 'OptiAddress' as const,
    }))
    return [{ ...base, ...address, group: 'multiple', options }]
  }
  const real = item.suggestions.filter((s) => !sameButCase(s.value, item.sent[s.field] ?? ''))
  if (real.length > 0) {
    return real.map((s) => {
      const original = item.sent[s.field] ?? ''
      const proposal = inUserCase(s.value, original)
      return { ...base, field: s.field, original, proposal, group: 'proposal', options: [{ value: proposal, source: s.source }] }
    })
  }
  const hadCorrection = item.messages.some((m) => isCorrectionCode(m.code))
  const remarks = item.messages.filter((m) => m.severity !== 'INFO' && !isCorrectionCode(m.code))
  if (hadCorrection || remarks.length === 0) {
    return [{ ...base, field: 'streetHouseBox', original: item.sent.streetHouseBox ?? '', group: 'ok', options: [] }]
  }
  const code = remarks[0].code
  return [
    {
      ...base,
      field: 'streetHouseBox',
      original: item.sent.streetHouseBox ?? '',
      group: 'note',
      options: [],
      note: NOTES[code] ?? `Onbekende melding van e-MassPost (${code}).`,
    },
  ]
}

/**
 * The rows of step 4 from a MailingCheck result. A proposal that only differs in capitals counts as
 * in order (decision 37 of 02/10). Addresses without a reply from bpost are in order.
 * @param result The parsed `_2RS`.
 * @param sentItems Number of addresses in the request (the reply may skip addresses without remarks).
 * @param base The uncorrected values per row number (the mapped Excel rows), so a change in step 4
 *   keeps the corrections of step 3 (`valueChanges`).
 * @returns Rows, counts per group (addresses, not rows) and unknown codes.
 */
export function groupCheckResult(
  result: MailingResult,
  sentItems: number,
  base?: ReadonlyMap<number, Partial<Record<AddressField, string>>>,
): CheckView {
  const rows = result.items.flatMap((item) =>
    rowsOf(item).map((r) => ({ ...r, key: `${r.seq}:${r.field}`, ...(base?.has(r.seq) ? { base: base.get(r.seq) } : {}) })),
  )
  const counts: Record<CheckGroupId, number> = { noAddress: 0, multiple: 0, proposal: 0, note: 0, ok: 0 }
  const seen = new Map<number, CheckGroupId>()
  for (const row of rows) if (!seen.has(row.seq)) seen.set(row.seq, row.group)
  for (const group of seen.values()) counts[group]++
  counts.ok += Math.max(0, sentItems - seen.size)
  const unknownCodes = [...new Set(result.items.flatMap((i) => i.messages.map((m) => m.code)).filter((c) => !KNOWN.has(c)))]
  return { rows, counts, unknownCodes }
}

/**
 * The value of a row now: the correction, or the original.
 * @param row The row.
 * @param values Corrections by `<seq>:<field>`.
 * @returns The value shown.
 */
export function currentValue(row: CheckRow, values: Readonly<Record<string, string>>): string {
  if (row.field !== 'address') return values[row.key] ?? row.base?.[row.field] ?? row.original
  return joinAddress({
    streetHouseBox: values[`${row.seq}:streetHouseBox`] ?? startOf(row, 'streetHouseBox'),
    postcodeCity: values[`${row.seq}:postcodeCity`] ?? startOf(row, 'postcodeCity'),
  })
}

/** A field without correction: the uncorrected value, or what was sent when that is unknown. */
const startOf = (row: CheckRow, field: AddressField) => row.base?.[field] ?? row.sent[field]

/**
 * The corrections a new value of a row gives. For an address: street and postcode apart. A value that
 * equals the uncorrected one clears its correction (`undefined`); any other value is written, also when
 * it equals what was sent, so a correction of step 3 stays. Call only with a value `splitAddress` accepts.
 * @param row The row.
 * @param value The new value.
 * @returns Changes by key.
 */
export function valueChanges(row: CheckRow, value: string): { key: string; value: string | undefined }[] {
  if (row.field !== 'address') {
    return [{ key: row.key, value: value === (row.base?.[row.field] ?? row.original) ? undefined : value }]
  }
  const parts = splitAddress(value)
  if (!parts) return []
  return (['streetHouseBox', 'postcodeCity'] as const).map((field) => ({
    key: `${row.seq}:${field}`,
    value: parts[field] === startOf(row, field) ? undefined : parts[field],
  }))
}

/**
 * Whether a row still asks for something: an address not found, several found, or a proposal, as
 * long as the value is the one sent and the row is not excluded. Notes never block.
 * @param row The row.
 * @param values Corrections.
 * @param excluded Excluded rows by seq.
 * @returns True while open.
 */
export function isOpen(
  row: CheckRow,
  values: Readonly<Record<string, string>>,
  excluded: Readonly<Record<number, true>>,
): boolean {
  if (row.group === 'note' || row.group === 'ok' || excluded[row.seq]) return false
  return currentValue(row, values) === row.original
}

/**
 * The ARR bpost would give now, as a light "phantom" line (decision 39 of 02/10): bpost's rate, plus the
 * addresses not found that you changed, minus what you left out since. An estimate; only bpost decides.
 * @param input The ARR of bpost, the number sent, the rows, corrections, exclusions now and at sending.
 * @returns A percentage with one decimal, or null without an ARR.
 */
export function estimateArr(input: {
  arr: number | null
  sentItems: number
  rows: readonly CheckRow[]
  values: Readonly<Record<string, string>>
  excluded: Readonly<Record<number, true>>
  excludedAtSend: readonly number[]
}): number | null {
  const { arr, sentItems, rows, values, excluded } = input
  if (arr === null || sentItems === 0) return arr
  const errorRows = rows.filter((r) => r.group === 'noAddress' || r.group === 'multiple')
  const errorSeqs = new Set(errorRows.map((r) => r.seq))
  const before = new Set(input.excludedAtSend)
  const fixed = errorRows.filter((r) => !excluded[r.seq] && currentValue(r, values) !== r.original).length
  const dropErr = [...errorSeqs].filter((seq) => excluded[seq]).length
  const dropOther = Object.keys(excluded).map(Number).filter((seq) => !errorSeqs.has(seq) && !before.has(seq)).length
  const total = sentItems - dropErr - dropOther
  if (total <= 0) return null
  const recognized = (arr / 100) * sentItems + fixed - dropOther
  return Math.round(Math.min(100, Math.max(0, (recognized / total) * 100)) * 10) / 10
}

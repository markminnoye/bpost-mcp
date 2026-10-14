import { z } from 'zod'
import type { ColumnMapping } from '../mapping'

/** Version of `mailing.json`. A mailing with another version is shown as unreadable. */
export const MAILING_SCHEMA_VERSION = 1

/**
 * Statuses of a mailing, from `docs/ontwerp/webapp/statusiconen.html`. v1 reaches only
 * `uploaded`, `mapped` and `format`; the list can show all of them.
 */
export const MAILING_STATUSES = ['uploaded', 'mapped', 'format', 'checked', 'submitted', 'overdue', 'done', 'withdrawn'] as const
/** One status of a mailing. */
export type MailingStatus = (typeof MAILING_STATUSES)[number]

/** Group of a status: 0 needs action, 1 waiting, 2 done (SR-112 decision 9). */
export const STATUS_GROUP: Record<MailingStatus, 0 | 1 | 2> = {
  uploaded: 0,
  mapped: 1,
  format: 0,
  checked: 0,
  submitted: 2,
  overdue: 0,
  done: 2,
  withdrawn: 0,
}

/** Group of a row: a mailing with format errors open needs action, although its status is "mapped". */
function statusGroup(m: MailingSummary): 0 | 1 | 2 {
  if (m.waiting) return 1
  return m.status === 'mapped' && (m.formatIssuesOpen ?? 0) > 0 ? 0 : STATUS_GROUP[m.status]
}

/** Letters, digits and hyphens, at most 20 characters. The code is also the `mailingRef` to bpost. */
export const MAILING_CODE_PATTERN = /^[A-Za-z0-9-]{1,20}$/

const stamp = z.object({ at: z.string().datetime(), by: z.string().min(1) })

/**
 * One file sent to bpost and what came back (design 13/10, part 2). The files themselves are in the
 * store under `e-masspost/`; this is the log and the state.
 */
export const exchangeSchema = z.object({
  kind: z.enum(['check', 'create']),
  /** Canonical name of the request, `…_0RQ.XML`; responses name it in `RequestProps`/`FileReceived`. */
  fileName: z.string().min(1),
  mailingRef: z.string().min(1).max(20),
  mode: z.enum(['T', 'C', 'P']),
  /** Addresses in the file. */
  items: z.number().int().nonnegative(),
  /** `itemsFingerprint` of what was sent: shows a change after sending. */
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  /** Rows excluded when it was sent (for the estimate). */
  excluded: z.array(z.number().int()),
  sentAt: z.string().datetime(),
  sentBy: z.string(),
  /** sent → received (acknowledgement) → processed, or rejected. */
  state: z.enum(['sent', 'received', 'processed', 'rejected']),
  receivedAt: z.string().nullable().optional(),
  /** Name of the result file (`_2RS`) once processed. */
  responseFile: z.string().optional(),
  statusCode: z.string().optional(),
  arr: z.number().nullable().optional(),
  /** Codes of bpost when refused, e.g. `MID-2040`. */
  problem: z.string().optional(),
})

/** One exchange with bpost. */
export type Exchange = z.infer<typeof exchangeSchema>

/** Zod schema of the addresses per group of an address check (`counts.check`). */
export const checkCountsSchema = z.object({
  noAddress: z.number().int().nonnegative(),
  multiple: z.number().int().nonnegative(),
  proposal: z.number().int().nonnegative(),
  note: z.number().int().nonnegative(),
  ok: z.number().int().nonnegative(),
})

/** Addresses per group of the last address check. */
export type CheckCounts = z.infer<typeof checkCountsSchema>

/** Zod schema of `mailing.json` (SR-112 plan §1). `id` is the store id (later the Drive folder id). */
export const mailingSchema = z.object({
  schemaVersion: z.literal(MAILING_SCHEMA_VERSION),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  code: z.string().regex(MAILING_CODE_PATTERN),
  title: z.string().trim().min(1).max(200),
  customer: z.object({ name: z.string().max(200), crmId: z.string().nullable() }),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['Small', 'Large']),
  priority: z.enum(['NP', 'P']),
  genMID: z.enum(['N', '7', '9', '11']),
  genPSC: z.enum(['Y', 'N']),
  roundAndSequence: z.boolean(),
  /** Mode at e-MassPost: Test, Certification or Production (design 13/10, decision 14). Absent: Production. */
  mode: z.enum(['T', 'C', 'P']).optional(),
  status: z.enum(MAILING_STATUSES),
  archived: z.boolean(),
  source: z.object({
    name: z.string().min(1),
    size: z.number().int().nonnegative(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }),
  mapping: z.object({ order: z.array(z.string()), roles: z.record(z.string(), z.string()) }).nullable(),
  /** Corrected values, keyed `<seq>:<field>` as in the format step. */
  corrections: z.record(z.string(), z.string()),
  /** Excluded rows, by `seq` (the Excel row number). */
  excludedRows: z.array(z.number().int()),
  counts: z.object({
    addresses: z.number().int().nonnegative(),
    formatIssuesOpen: z.number().int().nonnegative().nullable(),
    /** Addresses outside Belgium, as the step bar counts them. Absent or null: not counted yet. */
    foreign: z.number().int().nonnegative().nullable().optional(),
    /** Addresses per group of the last address check (design 13/10, part 2). */
    check: checkCountsSchema.optional(),
  }),
  arr: z.number().min(0).max(100).nullable(),
  /** Files sent to bpost and their state (design 13/10, part 2). */
  exchanges: z.array(exchangeSchema).optional(),
  log: z.array(z.object({ at: z.string().datetime(), by: z.string(), event: z.string() })),
  created: stamp,
  modified: stamp,
})

/** A mailing as stored in `mailing.json`. */
export type Mailing = z.infer<typeof mailingSchema>

/**
 * The mode a submission of the mailing goes in: the stored one, or Production for a mailing saved
 * before the mode existed (design 13/10, decision 14; ADR 0010).
 * @param m The mailing.
 * @returns `T`, `C` or `P`.
 */
export function modeOf(m: Pick<Mailing, 'mode'>): 'T' | 'C' | 'P' {
  return m.mode ?? 'P'
}

/** What the user fills in at step 1. */
export type MailingDetails = Pick<
  Mailing,
  'code' | 'title' | 'customer' | 'expectedDeliveryDate' | 'format' | 'priority' | 'genMID' | 'genPSC' | 'roundAndSequence' | 'mode'
>

/** One row in the list. Later the same fields go into Drive `appProperties`. */
export interface MailingSummary {
  id: string
  code: string
  title: string
  status: MailingStatus
  archived: boolean
  customer: string
  addresses: number
  formatIssuesOpen: number | null
  /** Rows left out of the mailing (`addresses` counts every row of the file). */
  excluded: number
  /** Addresses outside Belgium; null: not counted yet. */
  foreign: number | null
  arr: number | null
  expectedDeliveryDate: string
  modifiedAt: string
  /** A file is with bpost and no result came back yet: the icon "wachten". */
  waiting: boolean
  /** Mode of the accepted submission, for the pill Test or Certificatie; null when not submitted. */
  submittedMode: 'T' | 'C' | 'P' | null
}

/**
 * Whether the mailing waits for bpost: its last exchange was sent or acknowledged, not answered.
 * @param m The mailing.
 * @returns True while waiting.
 */
export function isWaiting(m: Mailing): boolean {
  const last = m.exchanges?.at(-1)
  return last?.state === 'sent' || last?.state === 'received'
}

/**
 * The fields of a mailing the list needs. The status is the current one: as long as format errors
 * are open, the mailing stays "mapped" (Mark, 13/10); only a validated format makes it `format`.
 * @param m The mailing.
 * @returns Its summary.
 */
export function summarize(m: Mailing): MailingSummary {
  return {
    id: m.id,
    code: m.code,
    title: m.title,
    status: m.status === 'format' && (m.counts.formatIssuesOpen ?? 0) > 0 ? 'mapped' : m.status,
    archived: m.archived,
    customer: m.customer.name,
    addresses: m.counts.addresses,
    formatIssuesOpen: m.counts.formatIssuesOpen,
    excluded: m.excludedRows.length,
    foreign: m.counts.foreign ?? null,
    arr: m.arr,
    expectedDeliveryDate: m.expectedDeliveryDate,
    modifiedAt: m.modified.at,
    waiting: isWaiting(m),
    submittedMode: m.status === 'submitted'
      ? (m.exchanges?.findLast((e) => e.kind === 'create' && e.state === 'processed')?.mode ?? null)
      : null,
  }
}

/** Sort orders of the list (SR-112 decision 24). */
export type MailingSort = 'status' | 'date' | 'modified' | 'code' | 'title'

const byDate = (a: MailingSummary, b: MailingSummary) =>
  (a.expectedDeliveryDate || '9999').localeCompare(b.expectedDeliveryDate || '9999')

/** Year and number of a code like `CP-2026-15`, for "newest first". */
function codeKey(code: string): [number, number] {
  const m = /-(\d{4})-(\d+)$/.exec(code)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/**
 * Sorts the list. `status`: action needed, then waiting, then done (submitted before done), then the
 * earliest delivery date. `date`: earliest first. `modified`: most recent first. `code`: newest first.
 * `title`: A–Z. Returns a new array.
 * @param items The rows.
 * @param sort The order.
 * @returns The sorted rows.
 * @example sortMailings(rows, 'status')
 */
export function sortMailings(items: readonly MailingSummary[], sort: MailingSort): MailingSummary[] {
  const out = [...items]
  const collator = new Intl.Collator('nl', { sensitivity: 'base', numeric: true })
  switch (sort) {
    case 'status':
      return out.sort(
        (a, b) =>
          statusGroup(a) - statusGroup(b) ||
          // Within a group the same icons stay together, in the order of the flow; then by date.
          MAILING_STATUSES.indexOf(a.status) - MAILING_STATUSES.indexOf(b.status) ||
          byDate(a, b),
      )
    case 'date':
      return out.sort(byDate)
    case 'modified':
      return out.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    case 'code':
      return out.sort((a, b) => {
        const [ya, na] = codeKey(a.code)
        const [yb, nb] = codeKey(b.code)
        return yb - ya || nb - na || collator.compare(b.code, a.code)
      })
    case 'title':
      return out.sort((a, b) => collator.compare(a.title, b.title))
  }
}

/**
 * Checks a mailing code: letters, digits and hyphens, 1 to 20 characters.
 * @param code The code.
 * @returns True when valid.
 */
export function isValidMailingCode(code: string): boolean {
  return MAILING_CODE_PATTERN.test(code)
}

/**
 * Prefix for codes when the tenant has none set: the first letters of the first two words, or the
 * first two letters of a single word, in capitals.
 * @param tenantName The tenant name.
 * @returns The prefix, `M` when the name has no letters.
 * @example defaultCodePrefix('Sonic Rocket') // 'SR'
 */
export function defaultCodePrefix(tenantName: string): string {
  const words = tenantName
    .normalize('NFD')
    .replace(/[^A-Za-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'M'
  const prefix = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return prefix.toUpperCase()
}

/**
 * The next code: prefix, year and the highest number of that year plus one (SR-112 decision 17).
 * @param prefix The tenant prefix (case-insensitive; the result is in capitals).
 * @param year The year.
 * @param existing All codes in the store, archived ones included.
 * @returns A code like `CP-2026-15`.
 * @example nextMailingCode('CP', 2026, ['CP-2026-14']) // 'CP-2026-15'
 */
export function nextMailingCode(prefix: string, year: number, existing: readonly string[]): string {
  const p = prefix.toUpperCase()
  const pattern = new RegExp(`^${p.replace(/-/g, '\\-')}-${year}-(\\d+)$`, 'i')
  const highest = existing.reduce((max, code) => {
    const m = pattern.exec(code)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `${p}-${year}-${highest + 1}`
}

/** From this many addresses, presort is required for small format (meeting 06/10, SR-86). */
export const PRESORT_REQUIRED_FROM = 25_000
/** From this many addresses, round and sequence is on by default for large format (SR-112 decision 25). */
export const ROUND_SEQUENCE_DEFAULT_FROM = 10_000

/**
 * Presort is required and cannot be switched off.
 * @param format Small or Large.
 * @param addresses Number of addresses in the file.
 * @returns True when locked on.
 */
export function presortLocked(format: Mailing['format'], addresses: number): boolean {
  return format === 'Small' && addresses >= PRESORT_REQUIRED_FROM
}

/**
 * Round and sequence exists only for large format.
 * @param format Small or Large.
 * @returns True when the choice is available.
 */
export function roundSequenceAllowed(format: Mailing['format']): boolean {
  return format === 'Large'
}

/**
 * Default of round and sequence, until the user chooses.
 * @param format Small or Large.
 * @param addresses Number of addresses in the file.
 * @returns True when on by default.
 */
export function defaultRoundSequence(format: Mailing['format'], addresses: number): boolean {
  return roundSequenceAllowed(format) && addresses >= ROUND_SEQUENCE_DEFAULT_FROM
}

/** Easter Sunday of a year (Gregorian calendar, anonymous algorithm), as UTC midnight. */
function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const DAY = 86_400_000

/**
 * The ten Belgian public holidays of a year, as `YYYY-MM-DD`: New Year, Easter Monday, Labour Day,
 * Ascension, Whit Monday, National Day, Assumption, All Saints, Armistice and Christmas.
 * @param year The year.
 * @returns The dates.
 */
export function belgianPublicHolidays(year: number): string[] {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const e = easter(year).getTime()
  const fixed = ['01-01', '05-01', '07-21', '08-15', '11-01', '11-11', '12-25'].map((md) => `${year}-${md}`)
  const moving = [1, 39, 50].map((days) => iso(new Date(e + days * DAY)))
  return [...fixed, ...moving].sort()
}

/**
 * Whether bpost takes a deposit on this day: Monday to Friday, not a Belgian public holiday. bpost
 * refuses a deposit date that is not a working day (MPW-1043); the guide does not list those days,
 * so this is our reading of it.
 * @param date The day as `YYYY-MM-DD`.
 * @returns True on a working day.
 * @example isBpostWorkingDay('2026-10-24') // false: a Saturday
 */
export function isBpostWorkingDay(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`)
  const weekday = d.getUTCDay()
  if (weekday === 0 || weekday === 6) return false
  return !belgianPublicHolidays(d.getUTCFullYear()).includes(date)
}

/**
 * The corrections that stay valid after the mapping changed: those of a field (address block) whose
 * columns stayed the same, in the same order. A correction hangs on `<row>:<field>`; when the columns
 * of that field change, its original value changes too, so the correction no longer fits (Mark, 13/10;
 * before, every mapping change dropped all corrections).
 * @param corrections The corrections, by `<row>:<field>`.
 * @param before The mapping the corrections were made on.
 * @param after The new mapping.
 * @returns The corrections of the fields that did not change.
 * @example
 * keepCorrections({ '134:streetHouseBox': 'Kerkstraat 1 bus 1' }, before, { ...before, name: ['Naam'] })
 * // { '134:streetHouseBox': 'Kerkstraat 1 bus 1' }
 */
export function keepCorrections(
  corrections: Readonly<Record<string, string>>,
  before: ColumnMapping,
  after: ColumnMapping,
): Record<string, string> {
  const same = (field: keyof ColumnMapping) =>
    JSON.stringify(before[field] ?? []) === JSON.stringify(after[field] ?? [])
  return Object.fromEntries(
    Object.entries(corrections).filter(([key]) => same(key.slice(key.indexOf(':') + 1) as keyof ColumnMapping)),
  )
}

/** Something still needed before "Verder naar koppelen". */
export type MissingDetail = 'title' | 'code' | 'date' | 'file'

/**
 * What is still missing at step 1, in form order. Format and priority always have a value.
 * @param draft The fields that can be empty or wrong, and whether a file was read without error.
 * @param today Today as `YYYY-MM-DD`; the delivery date may not be earlier, and must be a working day.
 * @returns The missing items; empty when "Verder" may be enabled.
 */
export function missingDetails(
  draft: { title: string; code: string; expectedDeliveryDate: string; hasFile: boolean },
  today: string,
): MissingDetail[] {
  const missing: MissingDetail[] = []
  if (!draft.title.trim()) missing.push('title')
  if (!isValidMailingCode(draft.code)) missing.push('code')
  const date = draft.expectedDeliveryDate
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || !isBpostWorkingDay(date)) missing.push('date')
  if (!draft.hasFile) missing.push('file')
  return missing
}

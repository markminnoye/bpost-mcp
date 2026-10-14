// src/core/masspost/request-file.ts
// The XML file the web app puts in the mailbox (design 13/10, part 1): a MailingCheck (always Test)
// or a MailingCreate (mode chosen per mailing, ADR 0010), made in the browser from the rows that go
// along, with their corrections. Browser-safe: no Node APIs.
import { buildXml, parseXml } from '@/lib/xml'
import { buildMailingCheckRequest, buildMailingRequest, rowsToItems } from './build-request'
import { buildMailingRequestFileName, normalizeBpostCustomerFileRef } from './file-naming'
import { COUNTRY_COMP_CODES, UNSTRUCTURED_COMP_CODES, type AddressField, type MappedField, type MappedRow } from './mapping'
import { stripEmptyDepositType } from './pipeline'
import { sha256Hex } from './store/hash'
import { validateMailingRequest, type ValidationIssue } from './validate'

const FIELD_OF: Record<string, AddressField> = {
  ...Object.fromEntries(Object.entries(UNSTRUCTURED_COMP_CODES).map(([f, c]) => [c, f as AddressField])),
  [COUNTRY_COMP_CODES.isoCode]: 'country',
  [COUNTRY_COMP_CODES.name]: 'country',
}

/** Header mode of a request: Test, Certification or Production. */
export type BpostMode = 'T' | 'C' | 'P'

/** The bpost numbers of the tenant: PRS id (Context/@sender, Header/@customerId) and account id. */
export interface BpostIds {
  customerId: string
  accountId: string
}

/** MID file version of the web app (AGENTS.md, locked 28/09/2026). */
export const WEB_MID_VERSION = '0200' as const
/** `customerFileRef` of the web app, as in every tested file (`REFERENCE0` after normalizing). */
export const WEB_CUSTOMER_FILE_REF = 'REFERENCE'

const MAX_REF = 20
const EMPTY: MappedField = { value: '', truncated: false, originalLength: 0, replacedChars: [], unsupportedChars: [] }

/**
 * The rows that go to bpost: excluded rows left out, corrections (by `<seq>:<field>`) applied.
 * @param rows Output of `mapRows` with the spreadsheet row numbers.
 * @param corrections Corrected values by `<seq>:<field>` (steps 3 and 4 share them).
 * @param excludedRows Row numbers left out of the mailing.
 * @returns New rows; the input is not changed.
 * @example correctedRows(rows, { '2:streetHouseBox': 'Kerkstraat 1 bus 2' }, [977])
 */
export function correctedRows(
  rows: readonly MappedRow[],
  corrections: Readonly<Record<string, string>>,
  excludedRows: readonly number[],
): MappedRow[] {
  const excluded = new Set(excludedRows)
  const bySeq = new Map<number, [AddressField, string][]>()
  for (const [key, value] of Object.entries(corrections)) {
    const i = key.indexOf(':')
    const seq = Number(key.slice(0, i))
    bySeq.set(seq, [...(bySeq.get(seq) ?? []), [key.slice(i + 1) as AddressField, value]])
  }
  return rows
    .filter((row) => !excluded.has(row.seq))
    .map((row) => {
      const fixes = bySeq.get(row.seq)
      if (!fixes) return row
      const fields = { ...row.fields }
      for (const [field, value] of fixes) fields[field] = { ...(fields[field] ?? EMPTY), value }
      return { ...row, fields }
    })
}

function withSuffix(code: string, suffix: string): string {
  return code.length + suffix.length <= MAX_REF ? code + suffix : code.slice(0, MAX_REF - suffix.length) + suffix
}

/**
 * `mailingRef` of the n-th address check of a mailing: bpost wants a new one for every check.
 * @param code The code of the mailing.
 * @param n 1 for the first check.
 * @returns At most 20 characters, e.g. `CP-2026-15-C2`.
 */
export function checkMailingRef(code: string, n: number): string {
  return withSuffix(code, `-C${n}`)
}

/**
 * `mailingRef` of the n-th submission: the code itself the first time (decision 17 of 11/10), then
 * `<code>-2`, `-3`… (e.g. Production after Test).
 * @param code The code of the mailing.
 * @param n 1 for the first submission.
 * @returns At most 20 characters.
 */
export function createMailingRef(code: string, n: number): string {
  return n <= 1 ? code : withSuffix(code, `-${n}`)
}

/**
 * Text as ISO-8859-1 bytes, the encoding of every bpost file.
 * @param text Text with only Latin-1 characters (`validateMailingRequest` checks that first).
 * @returns One byte per character.
 * @throws Error when a character is outside ISO-8859-1.
 */
export function encodeLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 0xff) throw new Error(`Teken buiten ISO-8859-1: ${text[i]}`)
    bytes[i] = code
  }
  return bytes
}

/**
 * ISO-8859-1 bytes as text (a response of bpost). Every byte is one character.
 * @param bytes The file.
 * @returns The text.
 */
export function decodeLatin1(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192))
  return out
}

/**
 * A fingerprint of what goes to bpost: the same rows give the same value. Shows that the list changed
 * after it was sent (design 13/10, decision 3).
 * @param rows The rows that go along (`correctedRows`).
 * @param priority Priority of the items.
 * @returns 64 hex characters.
 */
export async function itemsFingerprint(rows: readonly MappedRow[], priority: 'P' | 'NP'): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(rowsToItems([...rows], priority)))
  return sha256Hex(bytes.buffer as ArrayBuffer)
}

/** Input for `buildRequestFile`. */
export interface RequestFileInput {
  kind: 'check' | 'create'
  /** The rows that go along, corrected (`correctedRows`). */
  rows: readonly MappedRow[]
  mailingRef: string
  /** Mode of a submission. A check is always `T` (ADR 0010). */
  mode: BpostMode
  priority: 'P' | 'NP'
  ids: BpostIds
  /** Time in the file name. */
  now: Date
  /** The details of step 1, for a submission. */
  create?: { expectedDeliveryDate: string; format: 'Small' | 'Large'; genMID: 'N' | '7' | '9' | '11'; genPSC: 'Y' | 'N' }
}

/** The file to put in the mailbox, and what the mailing remembers of it. */
export interface RequestFile {
  kind: 'check' | 'create'
  /** Canonical bpost name, `MID_0200_<sender>_REFERENCE0_<time>_0RQ.XML`. */
  fileName: string
  /** The XML as ISO-8859-1. */
  bytes: Uint8Array
  mailingRef: string
  mode: BpostMode
  /** Number of addresses in the file. */
  items: number
  fingerprint: string
}

/** The request fails the schema or holds characters bpost refuses. */
export class RequestInvalidError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(`MailingRequest invalid: ${issues.map((i) => `${i.path}: ${i.message}`).join('; ')}`)
    this.name = 'RequestInvalidError'
  }
}

/**
 * The addresses as they stand in a request file (what bpost got announced), by `seq`.
 * @param xml A MailingRequest (`…_0RQ.XML`), decoded.
 * @returns Address fields per row number.
 * @example
 * readRequestItems(decodeLatin1(file.bytes)).get(5) // { name, streetHouseBox, postcodeCity }
 */
export function readRequestItems(xml: string): Map<number, Partial<Record<AddressField, string>>> {
  type N = Record<string, unknown>
  const list = (v: unknown): N[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]) as N[]
  const root = (parseXml<N>(xml).MailingRequest ?? {}) as N
  const action = list(root.MailingCreate)[0] ?? list(root.MailingCheck)[0]
  const out = new Map<number, Partial<Record<AddressField, string>>>()
  for (const item of list((action?.Items as N | undefined)?.Item)) {
    const fields: Partial<Record<AddressField, string>> = {}
    for (const comp of list((item.Comps as N | undefined)?.Comp)) {
      const field = FIELD_OF[String(comp['@_code'])]
      if (field) fields[field] = String(comp['@_value'] ?? '')
    }
    out.set(Number(item['@_seq']), fields)
  }
  return out
}

/**
 * Builds the MailingCheck or MailingCreate file of a mailing, validated, with its canonical name.
 * @param input Kind, rows, reference, mode, priority, bpost numbers, time and (for a submission) the details.
 * @returns The file and its summary.
 * @throws RequestInvalidError when the request fails validation.
 * @example
 * const file = await buildRequestFile({ kind: 'check', rows, mailingRef: checkMailingRef(code, 1), mode: 'T', priority: 'NP', ids, now: new Date() })
 */
export async function buildRequestFile(input: RequestFileInput): Promise<RequestFile> {
  const items = rowsToItems([...input.rows], input.priority)
  const customerFileRef = normalizeBpostCustomerFileRef(WEB_CUSTOMER_FILE_REF)
  const credentials = { ...input.ids, midVersion: WEB_MID_VERSION }
  const mode: BpostMode = input.kind === 'check' ? 'T' : input.mode
  const request =
    input.kind === 'check'
      ? buildMailingCheckRequest(items, { mailingRef: input.mailingRef, priority: input.priority, mode: 'T', customerFileRef }, credentials)
      : buildMailingRequest(
          items,
          {
            mailingRef: input.mailingRef,
            priority: input.priority,
            mode,
            allowNonTestMode: true, // the user chose this mode for this mailing (ADR 0010)
            customerFileRef,
            ...input.create!,
          },
          credentials,
        )
  const validation = validateMailingRequest(request, WEB_MID_VERSION)
  if (!validation.valid || !validation.data) throw new RequestInvalidError(validation.issues)
  stripEmptyDepositType(validation.data)
  const xml = buildXml({ MailingRequest: validation.data })
  return {
    kind: input.kind,
    fileName: buildMailingRequestFileName({
      senderId: input.ids.customerId,
      customerFileRef,
      version: WEB_MID_VERSION,
      generatedAt: input.now,
    }),
    bytes: encodeLatin1(xml),
    mailingRef: input.mailingRef,
    mode,
    items: items.length,
    fingerprint: await itemsFingerprint(input.rows, input.priority),
  }
}

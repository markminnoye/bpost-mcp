import { parseXml } from '@/lib/xml'
import { COUNTRY_COMP_CODES, UNSTRUCTURED_COMP_CODES, type AddressField } from './mapping'

/** One message from a MailingResponse `Replies` block. */
export interface MailingResponseMessage {
  code: string
  severity: string
  description?: string
}

/** Reads file-level Replies from a MailingResponse (2RS) XML string.
 *
 * @param xml Response XML.
 * @returns Messages that have a code. Missing reply blocks yield an empty array.
 */
export function extractMailingResponseMessages(xml: string): MailingResponseMessage[] {
  const doc = parseXml<Record<string, unknown>>(xml)
  const root = (doc.MailingResponse ?? doc) as Record<string, unknown>
  const replies = root.Replies as Record<string, unknown> | undefined
  if (!replies?.Reply) return []

  const replyList = Array.isArray(replies.Reply) ? replies.Reply : [replies.Reply]
  const messages: MailingResponseMessage[] = []

  for (const reply of replyList) {
    const r = reply as Record<string, unknown>
    const msgBlock = r.Messages as Record<string, unknown> | undefined
    if (!msgBlock?.Message) continue
    const msgList = Array.isArray(msgBlock.Message) ? msgBlock.Message : [msgBlock.Message]
    for (const msg of msgList) {
      const m = msg as Record<string, unknown>
      const code = String(m['@_code'] ?? m.code ?? '')
      const severity = String(m['@_severity'] ?? m.severity ?? '')
      const description =
        typeof m.Description === 'string'
          ? m.Description
          : typeof (m as { description?: string }).description === 'string'
            ? (m as { description: string }).description
            : undefined
      if (code) messages.push({ code, severity, description })
    }
  }
  return messages
}

/**
 * Reports whether any file-level message has severity `FATAL`.
 *
 * @param xml Response XML.
 * @returns `true` when `extractMailingResponseMessages` finds a fatal message.
 */
export function hasFatalMailingResponse(xml: string): boolean {
  return extractMailingResponseMessages(xml).some((m) => m.severity === 'FATAL')
}

/** One message of bpost, with its key/value contents (e.g. `compCode`, `compCorrection`, `midNum`). */
export interface BpostMessage {
  code: string
  severity: string
  contents: Record<string, string>
}

/** Where a proposal comes from. Later other sources join (postcode.eu, bpost Address Validation). */
export type SuggestionSource = 'OptiAddress'

/** A proposal for one field of an address. */
export interface AddressSuggestion {
  field: AddressField
  value: string
  source: SuggestionSource
}

/** A whole address bpost proposes when it finds several (`MID-4020`, `Suggestions`). */
export type AddressCandidate = Partial<Record<AddressField, string>>

/** What bpost says about one address, by `seq` (the row number in the Excel). */
export interface ItemResult {
  seq: number
  messages: BpostMessage[]
  /** Corrections (`7001` / `MID-7001` with `compCode` and `compCorrection`). */
  suggestions: AddressSuggestion[]
  /** Candidates of `Suggestions` (may be empty: never seen live yet). */
  candidates: AddressCandidate[]
  /** The address as sent (`RequestItem`, with `copyRequestItem="Y"`). */
  sent: Partial<Record<AddressField, string>>
  /** Mail ID (`MID-4030`, `midNum`), in a MailingCreate result. */
  midNum?: string
}

/** The result of a MailingCheck or MailingCreate (`_2RS`). */
export interface MailingResult {
  kind: 'check' | 'create'
  /** Name of the request file this answers (`Header/Files/RequestProps/@fileName`). */
  requestFileName: string
  mailingRef: string
  /** `Status/@code`: 100 accepted, 998/999 refused; empty when the action is missing. */
  statusCode: string
  /** Address Recognition Rate in percent (`MID-4040`, `compliancyRateAtBuildingLevel`). */
  arr: number | null
  /** Messages about the file or the action, not about one address. */
  messages: BpostMessage[]
  items: ItemResult[]
}

/** The acknowledgement (`_1AK`): bpost received the file. */
export interface AckResult {
  kind: 'ack'
  requestFileName: string
  /** `FileReceived/@timeStamp`, as written by bpost (local time, no zone). */
  receivedAt: string | null
  messages: BpostMessage[]
}

/** Any file bpost sends back. */
export type BpostResponse = AckResult | MailingResult

/** The file is not an acknowledgement or a MailingResponse. */
export class NotABpostResponseError extends Error {
  constructor() {
    super('Not a bpost response (RequestAck or MailingResponse).')
    this.name = 'NotABpostResponseError'
  }
}

type Node = Record<string, unknown>
const list = (value: unknown): Node[] => (value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]) as Node[]
const attr = (node: Node | undefined, name: string) => String(node?.[`@_${name}`] ?? '')

const FIELD_BY_COMP: Record<string, AddressField> = {
  ...Object.fromEntries(Object.entries(UNSTRUCTURED_COMP_CODES).map(([field, code]) => [code, field as AddressField])),
  [COUNTRY_COMP_CODES.isoCode]: 'country',
  [COUNTRY_COMP_CODES.name]: 'country',
}

/**
 * True for the correction message of OptiAddress: live `7001`, documented `MID-7001` (field findings).
 * @param code A message code.
 * @returns True for `7001` and `MID-7001`.
 */
export function isCorrectionCode(code: string): boolean {
  return code === '7001' || code === 'MID-7001'
}

function readMessages(replyOrNode: Node | undefined): BpostMessage[] {
  const block = replyOrNode?.Messages as Node | undefined
  return list(block?.Message).map((m) => ({
    code: attr(m, 'code'),
    severity: attr(m, 'severity'),
    contents: Object.fromEntries(
      list((m.MessageContents as Node | undefined)?.MessageContent).map((c) => [attr(c, 'key'), attr(c, 'value')]),
    ),
  }))
}

function readComps(comps: Node | undefined): Partial<Record<AddressField, string>> {
  const out: Partial<Record<AddressField, string>> = {}
  for (const comp of list(comps?.Comp)) {
    const field = FIELD_BY_COMP[attr(comp, 'code')]
    if (field) out[field] = attr(comp, 'value')
  }
  return out
}

function itemSeq(reply: Node): number | null {
  const location = list((reply.Locations as Node | undefined)?.Location).find((l) => attr(l, 'tagName') === 'Item')
  return location ? Number(attr(location, 'attributeValue')) : null
}

function arrOf(messages: BpostMessage[]): number | null {
  const raw = messages.find((m) => m.code === 'MID-4040')?.contents.compliancyRateAtBuildingLevel
  const n = raw === undefined ? NaN : Number.parseFloat(raw.replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Reads any file bpost sends back: the acknowledgement (`RequestAck`, `_1AK`) or the result of a
 * MailingCheck or MailingCreate (`MailingResponse`, `_2RS`).
 * @param xml The file as text (decode the bytes as ISO-8859-1 first).
 * @returns The response, with `kind` `ack`, `check` or `create`.
 * @throws NotABpostResponseError for anything else.
 * @example
 * const r = parseBpostResponse(decodeLatin1(bytes))
 * if (r.kind === 'check') console.log(r.arr)
 */
export function parseBpostResponse(xml: string): BpostResponse {
  let doc: Node
  try {
    doc = parseXml<Node>(xml)
  } catch {
    throw new NotABpostResponseError()
  }
  const ack = doc.RequestAck as Node | undefined
  if (ack !== undefined) {
    const received = list(ack.FileReceived)[0]
    return {
      kind: 'ack',
      requestFileName: attr(received, 'fileName'),
      receivedAt: attr(received, 'timeStamp') || null,
      messages: list(ack.Replies && (ack.Replies as Node).Reply).flatMap(readMessages),
    }
  }
  const root = doc.MailingResponse as Node | undefined
  if (root === undefined || typeof root !== 'object') throw new NotABpostResponseError()
  const requestProps = list(((root.Header as Node | undefined)?.Files as Node | undefined)?.RequestProps)[0]
  const fileMessages = list((root.Replies as Node | undefined)?.Reply).flatMap(readMessages)
  const createAction = list(root.MailingCreate)[0]
  const action = createAction ?? list(root.MailingCheck)[0]
  const kind: 'check' | 'create' = createAction ? 'create' : 'check'
  const messages = [...fileMessages]
  const items: ItemResult[] = []
  for (const reply of list((action?.Replies as Node | undefined)?.Reply)) {
    const replyMessages = readMessages(reply)
    const seq = itemSeq(reply)
    if (seq === null) {
      messages.push(...replyMessages)
      continue
    }
    items.push({
      seq,
      messages: replyMessages,
      suggestions: replyMessages
        .filter((m) => isCorrectionCode(m.code) && FIELD_BY_COMP[m.contents.compCode] && m.contents.compCorrection)
        .map((m) => ({ field: FIELD_BY_COMP[m.contents.compCode], value: m.contents.compCorrection, source: 'OptiAddress' as const })),
      candidates: list((reply.Suggestions as Node | undefined)?.Suggestion).map((s) => readComps(s.Comps as Node | undefined)),
      sent: readComps((list(reply.RequestItem)[0]?.Comps as Node | undefined) ?? undefined),
      ...(replyMessages.find((m) => m.code === 'MID-4030')?.contents.midNum
        ? { midNum: replyMessages.find((m) => m.code === 'MID-4030')!.contents.midNum }
        : {}),
    })
  }
  return {
    kind,
    requestFileName: attr(requestProps, 'fileName'),
    mailingRef: attr(action, 'mailingRef'),
    statusCode: attr(list(action?.Status)[0], 'code'),
    arr: arrOf(messages),
    messages,
    items,
  }
}

/**
 * Whether bpost refused the file or the action: a `FATAL` or `ERROR` message on the file, status
 * 998 or 999, or a result without an action.
 * @param r A parsed response.
 * @returns True when refused.
 */
export function isRejected(r: BpostResponse): boolean {
  if (r.messages.some((m) => m.severity === 'FATAL' || m.severity === 'ERROR')) return true
  if (r.kind === 'ack') return false
  return r.statusCode !== '100'
}

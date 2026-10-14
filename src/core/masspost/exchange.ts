// src/core/masspost/exchange.ts
// What the web app remembers of the files it sent to bpost, and how a response changes the mailing
// (design 13/10, parts 2 and 5). Pure functions: the caller saves the change through the store.
import { groupCheckResult } from './address-check'
import { isRejected, NotABpostResponseError, parseBpostResponse, type BpostResponse } from './parse-response'
import type { RequestFile } from './request-file'
import type { Exchange, Mailing } from './store/mailing'
import type { MailingChange } from './store/mailing-store'

/**
 * The number of the next check or submission, for its `mailingRef`.
 * @param m The mailing.
 * @param kind Check or submission.
 * @returns 1 for the first.
 */
export function nextRefNumber(m: Mailing, kind: 'check' | 'create'): number {
  return (m.exchanges ?? []).filter((e) => e.kind === kind).length + 1
}

/**
 * The last exchange, of one kind or of any.
 * @param m The mailing.
 * @param kind Optional kind.
 * @returns The exchange, or undefined.
 */
export function latestExchange(m: Mailing, kind?: 'check' | 'create'): Exchange | undefined {
  return (m.exchanges ?? []).findLast((e) => kind === undefined || e.kind === kind)
}

/**
 * The change that records a file put in the mailbox.
 * @param m The mailing.
 * @param file The file (`buildRequestFile`).
 * @param excluded Rows excluded at this moment.
 * @param by E-mail of the user.
 * @param now The time.
 * @returns A change for `MailingStore.update`.
 */
export function recordSent(m: Mailing, file: RequestFile, excluded: readonly number[], by: string, now: Date): MailingChange {
  const exchange: Exchange = {
    kind: file.kind,
    fileName: file.fileName,
    mailingRef: file.mailingRef,
    mode: file.mode,
    items: file.items,
    fingerprint: file.fingerprint,
    excluded: [...excluded],
    sentAt: now.toISOString(),
    sentBy: by,
    state: 'sent',
  }
  return { exchanges: [...(m.exchanges ?? []), exchange] }
}

/**
 * Whether the list changed since the file was sent.
 * @param exchange The exchange.
 * @param fingerprint `itemsFingerprint` of the rows that go along now.
 * @returns True when different.
 */
export function changedSinceSent(exchange: Exchange, fingerprint: string): boolean {
  return exchange.fingerprint !== fingerprint
}

/**
 * Why e-MassPost refuses a file, in plain language (Vlaams), for the codes a check or a submission from
 * the web app can meet (`docs/internal/e-masspost/docs/errors/`). Other codes are "Onbekende melding".
 */
const REFUSALS: Record<string, string> = {
  'MID-1000': 'Je klantnummer of account-ID klopt niet. Kijk ze na bij Instellingen',
  'MID-1010': 'Je account mag geen bestanden opladen voor dit klantnummer',
  'MID-1020': 'Je mag nog niet in productie indienen: je klantnummer is niet gecertificeerd',
  'MID-1030': 'Je account mag deze actie niet uitvoeren',
  'MID-2010': 'De naam van het bestand klopt niet. Laad het bestand op zoals de app het opsloeg, zonder de naam te wijzigen',
  'MID-2040': 'Het bestand bevat een fout in de opbouw',
  'MID-2042': 'Twee adressen hebben hetzelfde rijnummer',
  'MID-2050': 'e-MassPost kreeg al een bestand met dezelfde naam. Controleer opnieuw: de app maakt een nieuw bestand',
  'MID-2055': 'Het bestand bevat iets wat e-MassPost niet aanvaardt',
  'MID-2072': 'De naam van het bestand past niet bij de inhoud. Laad het bestand op zoals de app het opsloeg',
  'MID-2073': 'De naam van het bestand past niet bij de inhoud. Laad het bestand op zoals de app het opsloeg',
  'MID-2074': 'De naam van het bestand past niet bij de inhoud. Laad het bestand op zoals de app het opsloeg',
  'MID-2075': 'Het klantnummer in het bestand is niet dat van je account. Kijk het klantnummer na bij Instellingen',
  'MID-2076':
    'Het account-ID in het bestand is niet het account waarmee je aanmeldde op de e-MassPost-website. Kijk het account-ID na bij Instellingen',
  'MID-3016': 'De afgiftedatum klopt niet. Pas ze aan in stap 1',
  'MID-3032': 'Deze referentie bestaat al bij e-MassPost. Probeer opnieuw: de app neemt een nieuwe referentie',
  'MID-3070': 'Deze referentie bestaat al bij e-MassPost. Probeer opnieuw: de app neemt een nieuwe referentie',
  'MID-3071': 'Deze referentie bestaat al bij e-MassPost. Probeer opnieuw: de app neemt een nieuwe referentie',
  'MID-3072': 'e-MassPost vindt geen certificatie voor je klantnummer',
  'MID-3073': 'e-MassPost vindt geen barcode- of certificatiegegevens voor je klantnummer',
  'MID-3077': 'Je klantnummer heeft geen Mail ID-nummer bij e-MassPost',
  'MID-9999': 'Er liep iets mis bij e-MassPost. Probeer het later opnieuw',
}

/**
 * The refusal of e-MassPost in plain language, one sentence per code, each with its code.
 * @param problem The `problem` of a rejected exchange: codes separated by commas, or `status 998`.
 * @returns Sentences for the user (Vlaams).
 * @example explainRefusal('MID-2040') // 'Het bestand bevat een fout in de opbouw (MID-2040).'
 */
export function explainRefusal(problem: string): string {
  return problem
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
    .map((code) => (REFUSALS[code] ? `${REFUSALS[code]} (${code}).` : `Onbekende melding van e-MassPost (${code}).`))
    .join(' ')
}

/** What a response file does to a mailing. */
export type ProcessOutcome =
  | { outcome: 'applied'; change: MailingChange; event: string; response: BpostResponse }
  | { outcome: 'duplicate' | 'older'; response: BpostResponse }
  | { outcome: 'foreign'; mailingRef: string | null }
  | { outcome: 'invalid' }

const problemOf = (r: BpostResponse) =>
  [...new Set(r.messages.filter((m) => m.severity === 'FATAL' || m.severity === 'ERROR').map((m) => m.code))].join(', ') ||
  (r.kind === 'ack' ? 'geweigerd' : `status ${r.statusCode || 'onbekend'}`)

/**
 * Processes a file bpost sent back: links it to the request by file name and gives the change.
 * An acknowledgement marks the exchange received; a result marks it processed (check: status
 * `checked`, ARR and counts; submission: `submitted`), or rejected without changing the status.
 * @param m The mailing.
 * @param fileName Name of the response file.
 * @param xml Its text (ISO-8859-1 decoded).
 * @param now The time.
 * @returns `applied` with the change, or why nothing changes.
 * @example
 * const r = processResponse(mailing, file.name, decodeLatin1(file.bytes), new Date())
 * if (r.outcome === 'applied') await store.update(mailing.id, r.change, mailing.revision, user, r.event)
 */
export function processResponse(m: Mailing, fileName: string, xml: string, now: Date): ProcessOutcome {
  let response: BpostResponse
  try {
    response = parseBpostResponse(xml)
  } catch (e) {
    if (e instanceof NotABpostResponseError) return { outcome: 'invalid' }
    throw e
  }
  const exchanges = m.exchanges ?? []
  const index = exchanges.findIndex((e) => e.fileName === response.requestFileName)
  if (index < 0) return { outcome: 'foreign', mailingRef: response.kind === 'ack' ? null : response.mailingRef || null }
  const exchange = exchanges[index]
  if (exchanges.some((e, i) => i > index && e.kind === exchange.kind)) return { outcome: 'older', response }
  const done = exchange.state === 'processed' || exchange.state === 'rejected'
  const replace = (next: Exchange) => exchanges.map((e, i) => (i === index ? next : e))

  if (response.kind === 'ack') {
    if (exchange.state !== 'sent') return { outcome: 'duplicate', response }
    const rejected = isRejected(response)
    return {
      outcome: 'applied',
      response,
      event: rejected ? 'bpost-rejected' : 'bpost-ack',
      change: {
        exchanges: replace({
          ...exchange,
          state: rejected ? 'rejected' : 'received',
          receivedAt: response.receivedAt ?? now.toISOString(),
          ...(rejected ? { problem: problemOf(response) } : {}),
        }),
      },
    }
  }

  if (done || exchange.responseFile === fileName) return { outcome: 'duplicate', response }
  if (isRejected(response)) {
    return {
      outcome: 'applied',
      response,
      event: 'bpost-rejected',
      change: {
        exchanges: replace({ ...exchange, state: 'rejected', responseFile: fileName, statusCode: response.statusCode, problem: problemOf(response) }),
      },
    }
  }
  const processed = replace({ ...exchange, state: 'processed', responseFile: fileName, statusCode: response.statusCode, arr: response.arr })
  if (response.kind === 'check') {
    return {
      outcome: 'applied',
      response,
      event: 'bpost-check',
      change: {
        exchanges: processed,
        // A new check after a submission does not undo "Ingediend".
        status: m.status === 'submitted' ? 'submitted' : 'checked',
        arr: response.arr,
        counts: { ...m.counts, check: groupCheckResult(response, exchange.items).counts },
      },
    }
  }
  return { outcome: 'applied', response, event: 'bpost-create', change: { exchanges: processed, status: 'submitted', arr: response.arr } }
}

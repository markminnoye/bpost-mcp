import { MAILING_SCHEMA_VERSION, type Mailing, type MailingDetails, type MailingSummary } from './mailing'

/** Input to create a mailing (step 1, "Verder naar koppelen"). */
export interface NewMailing {
  details: MailingDetails
  source: Mailing['source']
  addresses: number
}

/** Fields that can change after creation. The code is fixed once created. */
export type MailingChange = Partial<
  Pick<
    Mailing,
    | 'title'
    | 'customer'
    | 'expectedDeliveryDate'
    | 'format'
    | 'priority'
    | 'genMID'
    | 'genPSC'
    | 'roundAndSequence'
    | 'mode'
    | 'notifyEmail'
    | 'status'
    | 'mapping'
    | 'corrections'
    | 'excludedRows'
    | 'counts'
    | 'arr'
    | 'exchanges'
  >
>

/**
 * A row of the list, or a mailing that cannot be read (shown as "Kan deze mailing niet lezen"). An
 * unreadable mailing still gives its `code` when that field is readable: the code stays taken.
 */
export type MailingListItem = { ok: true; summary: MailingSummary } | { ok: false; id: string; code?: string }

/**
 * Where mailings live. v1: IndexedDB in the browser; later Google Drive (ADR 0007), behind the same
 * interface. Every write raises `revision`; `update` with an older revision is refused.
 */
export interface MailingStore {
  /** All mailings, archived ones included, unsorted. */
  list(): Promise<MailingListItem[]>
  /** One mailing, or null when unknown. Throws `UnreadableMailingError` when it fails the schema. */
  get(id: string): Promise<Mailing | null>
  /** The mailing with this code (case-insensitive), or null. */
  findByCode(code: string): Promise<Mailing | null>
  /** Creates the mailing with its Excel file. Throws `CodeTakenError` when the code exists. */
  create(input: NewMailing, file: Blob, by: string): Promise<Mailing>
  /** Applies a change. Throws `RevisionConflictError` when `expectedRevision` is not the current one. */
  update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing>
  /** Moves the mailing to the archive. */
  archive(id: string, by: string): Promise<Mailing>
  /** Takes the mailing out of the archive. */
  restore(id: string, by: string): Promise<Mailing>
  /** The Excel file of the mailing, or null. */
  getSourceFile(id: string): Promise<Blob | null>
  /** Saves a file of the mailing under a path (e.g. `e-masspost/…_0RQ.XML`); overwrites. Throws `MailingNotFoundError`. */
  saveFile(id: string, path: string, file: Blob): Promise<void>
  /** A file of the mailing, or null. */
  getFile(id: string, path: string): Promise<Blob | null>
  /** Paths of the files of the mailing that start with `prefix`, sorted. */
  listFiles(id: string, prefix: string): Promise<string[]>
}

/** Folder of the files exchanged with bpost, per mailing (design 13/10, part 2). Not `bpost/`: confusing. */
export const MAILING_FILES_DIR = 'e-masspost/'

/** Someone else saved the mailing in the meantime. `current` is the stored version. */
export class RevisionConflictError extends Error {
  constructor(public readonly current: Mailing) {
    super(`Mailing ${current.code} changed in the meantime (revision ${current.revision}).`)
    this.name = 'RevisionConflictError'
  }
}

/** A mailing with this code exists already (archived ones included). */
export class CodeTakenError extends Error {
  constructor(public readonly code: string) {
    super(`Code ${code} exists already.`)
    this.name = 'CodeTakenError'
  }
}

/** No mailing with this id. */
export class MailingNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Mailing ${id} not found.`)
    this.name = 'MailingNotFoundError'
  }
}

/** The stored data fails the schema (unknown version or broken). */
export class UnreadableMailingError extends Error {
  constructor(public readonly id: string) {
    super(`Mailing ${id} cannot be read.`)
    this.name = 'UnreadableMailingError'
  }
}

/** The storage of the browser is not available (private window, blocked, full). */
export class StoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Mailing storage is not available.', { cause })
    this.name = 'StoreUnavailableError'
  }
}

/** The storage is full (in the browser: `QuotaExceededError`). Not the same as unavailable. */
export class StoreFullError extends Error {
  constructor(cause?: unknown) {
    super('Mailing storage is full.', { cause })
    this.name = 'StoreFullError'
  }
}

/**
 * A new mailing as stored: status `uploaded`, revision 1, one log entry.
 * @param id Store id.
 * @param input Details, source and number of addresses.
 * @param by E-mail of the user.
 * @param now The time.
 * @returns The mailing.
 */
export function newMailing(id: string, input: NewMailing, by: string, now: Date): Mailing {
  const at = now.toISOString()
  return {
    schemaVersion: MAILING_SCHEMA_VERSION,
    id,
    revision: 1,
    ...input.details,
    status: 'uploaded',
    archived: false,
    source: input.source,
    mapping: null,
    corrections: {},
    excludedRows: [],
    counts: { addresses: input.addresses, formatIssuesOpen: null },
    arr: null,
    log: [{ at, by, event: 'created' }],
    created: { at, by },
    modified: { at, by },
  }
}

/**
 * Applies a change: raises the revision, sets `modified` and adds a log entry. Does not check the
 * revision; the store does that.
 * @param m The current mailing.
 * @param change The fields to change.
 * @param by E-mail of the user.
 * @param event Log event, e.g. `mapped`.
 * @param now The time.
 * @returns The new mailing.
 */
export function applyChange(
  m: Mailing,
  change: MailingChange & { archived?: boolean },
  by: string,
  event: string,
  now: Date,
): Mailing {
  const at = now.toISOString()
  return { ...m, ...change, revision: m.revision + 1, modified: { at, by }, log: [...m.log, { at, by, event }] }
}

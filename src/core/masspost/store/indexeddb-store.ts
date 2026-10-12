import { mailingSchema, summarize, type Mailing } from './mailing'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  StoreFullError,
  StoreUnavailableError,
  UnreadableMailingError,
  applyChange,
  newMailing,
  type MailingChange,
  type MailingListItem,
  type MailingStore,
  type NewMailing,
} from './mailing-store'

const VERSION = 1

/** The Excel file as stored: bytes plus media type (an ArrayBuffer clones everywhere, a Blob not). */
interface StoredFile {
  bytes: ArrayBuffer
  type: string
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** A failed write: full storage gets its own error, everything else is "unavailable". */
function writeError(e: unknown): Error {
  return (e as { name?: unknown } | null)?.name === 'QuotaExceededError' ? new StoreFullError(e) : new StoreUnavailableError(e)
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

const idOf = (raw: unknown) => String((raw as { id?: unknown } | undefined)?.id ?? '?')
const codeOf = (raw: unknown) => {
  const code = (raw as { code?: unknown } | undefined)?.code
  return typeof code === 'string' ? code : undefined
}
const sameCode = (raw: unknown, lowerCode: string) => codeOf(raw)?.toLowerCase() === lowerCode

/**
 * `MailingStore` in the browser's IndexedDB (v1, SR-112 v1 decision 2). Stays on this device only.
 * A write reads, checks the revision and writes in one transaction, so two tabs cannot overwrite
 * each other.
 */
export class IndexedDbMailingStore implements MailingStore {
  private db?: Promise<IDBDatabase>
  private readonly factory?: IDBFactory
  private readonly name: string
  private readonly now: () => Date
  private readonly newId: () => string

  /**
   * @param options `indexedDB` (default `globalThis.indexedDB`), database `name` (default
   * `bpost-e-masspost`), and `now`/`newId` for tests.
   */
  constructor(
    options: { indexedDB?: IDBFactory | undefined; name?: string; now?: () => Date; newId?: () => string } = {},
  ) {
    this.factory = 'indexedDB' in options ? options.indexedDB : globalThis.indexedDB
    this.name = options.name ?? 'bpost-e-masspost'
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) return reject(new StoreUnavailableError())
      let request: IDBOpenDBRequest
      try {
        request = this.factory.open(this.name, VERSION)
      } catch (e) {
        return reject(new StoreUnavailableError(e))
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('mailings')) db.createObjectStore('mailings', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new StoreUnavailableError(request.error))
      request.onblocked = () => reject(new StoreUnavailableError(new Error('blocked')))
    }).catch((e) => {
      this.db = undefined
      throw e instanceof StoreUnavailableError ? e : new StoreUnavailableError(e)
    })
    return this.db
  }

  private parse(raw: unknown): Mailing {
    const parsed = mailingSchema.safeParse(raw)
    if (!parsed.success) throw new UnreadableMailingError(idOf(raw))
    return parsed.data
  }

  async list(): Promise<MailingListItem[]> {
    const db = await this.open()
    const all = await done(db.transaction('mailings').objectStore('mailings').getAll())
    return all.map((raw) => {
      const parsed = mailingSchema.safeParse(raw)
      return parsed.success ? { ok: true as const, summary: summarize(parsed.data) } : { ok: false as const, id: idOf(raw), code: codeOf(raw) }
    })
  }

  async get(id: string): Promise<Mailing | null> {
    const db = await this.open()
    const raw = await done(db.transaction('mailings').objectStore('mailings').get(id))
    return raw === undefined ? null : this.parse(raw)
  }

  async findByCode(code: string): Promise<Mailing | null> {
    const db = await this.open()
    const all = await done(db.transaction('mailings').objectStore('mailings').getAll())
    const raw = all.find((r) => sameCode(r, code.toLowerCase()))
    return raw === undefined ? null : this.parse(raw)
  }

  async create(input: NewMailing, file: Blob, by: string): Promise<Mailing> {
    const db = await this.open()
    const m = mailingSchema.parse(newMailing(this.newId(), input, by, this.now()))
    const stored: StoredFile = { bytes: await file.arrayBuffer(), type: file.type }
    const tx = db.transaction(['mailings', 'files'], 'readwrite')
    const mailings = tx.objectStore('mailings')
    const ended = finished(tx)
    const all = mailings.getAll()
    let taken = false
    all.onsuccess = () => {
      taken = all.result.some((r) => sameCode(r, input.details.code.toLowerCase()))
      if (taken) return tx.abort()
      mailings.put(m)
      tx.objectStore('files').put(stored, m.id)
    }
    try {
      await ended
    } catch (e) {
      if (taken) throw new CodeTakenError(input.details.code)
      throw writeError(e)
    }
    return m
  }

  update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing> {
    return this.write(id, change, by, event, expectedRevision)
  }

  archive(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: true }, by, 'archived')
  }

  restore(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: false }, by, 'restored')
  }

  async getSourceFile(id: string): Promise<Blob | null> {
    const db = await this.open()
    const stored = (await done(db.transaction('files').objectStore('files').get(id))) as StoredFile | undefined
    return stored ? new Blob([stored.bytes], { type: stored.type }) : null
  }

  private async write(
    id: string,
    change: MailingChange & { archived?: boolean },
    by: string,
    event: string,
    expectedRevision?: number,
  ): Promise<Mailing> {
    const db = await this.open()
    const tx = db.transaction('mailings', 'readwrite')
    const store = tx.objectStore('mailings')
    const ended = finished(tx)
    let failure: Error | undefined
    let result: Mailing | undefined
    const read = store.get(id)
    read.onsuccess = () => {
      try {
        if (read.result === undefined) throw new MailingNotFoundError(id)
        const current = this.parse(read.result)
        if (expectedRevision !== undefined && current.revision !== expectedRevision) {
          throw new RevisionConflictError(current)
        }
        result = mailingSchema.parse(applyChange(current, change, by, event, this.now()))
        store.put(result)
      } catch (e) {
        failure = e as Error
        tx.abort()
      }
    }
    try {
      await ended
    } catch (e) {
      throw failure ?? writeError(e)
    }
    return result!
  }
}

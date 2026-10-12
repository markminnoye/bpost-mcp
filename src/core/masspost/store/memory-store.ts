import { mailingSchema, summarize, type Mailing } from './mailing'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  applyChange,
  newMailing,
  type MailingChange,
  type MailingListItem,
  type MailingStore,
  type NewMailing,
} from './mailing-store'

/** A `MailingStore` in memory, for tests and examples. Lost when the page reloads. */
export class MemoryMailingStore implements MailingStore {
  private readonly mailings = new Map<string, Mailing>()
  private readonly files = new Map<string, Blob>()
  private readonly now: () => Date
  private readonly newId: () => string

  /**
   * @param options `now` and `newId` can be replaced in tests.
   */
  constructor(options: { now?: () => Date; newId?: () => string } = {}) {
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  async list(): Promise<MailingListItem[]> {
    return [...this.mailings.values()].map((m) => ({ ok: true as const, summary: summarize(m) }))
  }

  async get(id: string): Promise<Mailing | null> {
    return this.mailings.get(id) ?? null
  }

  async findByCode(code: string): Promise<Mailing | null> {
    const c = code.toLowerCase()
    return [...this.mailings.values()].find((m) => m.code.toLowerCase() === c) ?? null
  }

  async create(input: NewMailing, file: Blob, by: string): Promise<Mailing> {
    if (await this.findByCode(input.details.code)) throw new CodeTakenError(input.details.code)
    const m = mailingSchema.parse(newMailing(this.newId(), input, by, this.now()))
    this.mailings.set(m.id, m)
    this.files.set(m.id, file)
    return m
  }

  async update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing> {
    return this.write(id, change, by, event, expectedRevision)
  }

  async archive(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: true }, by, 'archived')
  }

  async restore(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: false }, by, 'restored')
  }

  async getSourceFile(id: string): Promise<Blob | null> {
    return this.files.get(id) ?? null
  }

  private write(
    id: string,
    change: MailingChange & { archived?: boolean },
    by: string,
    event: string,
    expectedRevision?: number,
  ): Mailing {
    const current = this.mailings.get(id)
    if (!current) throw new MailingNotFoundError(id)
    if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new RevisionConflictError(current)
    const next = mailingSchema.parse(applyChange(current, change, by, event, this.now()))
    this.mailings.set(id, next)
    return next
  }
}

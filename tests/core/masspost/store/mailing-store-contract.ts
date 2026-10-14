import { describe, it, expect, beforeEach } from 'vitest'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  type MailingStore,
  type NewMailing,
} from '@/core/masspost/store/mailing-store'

export function newInput(code = 'CP-2026-1'): NewMailing {
  return {
    details: {
      code,
      title: 'Nieuwsbrief',
      customer: { name: 'Klant', crmId: null },
      expectedDeliveryDate: '2026-10-23', // a Friday: a working day
      format: 'Small',
      priority: 'NP',
      genMID: '7',
      genPSC: 'N',
      roundAndSequence: false,
    },
    source: { name: 'adressen.xlsx', size: 3, sha256: 'ab'.repeat(32) },
    addresses: 1246,
  }
}

const file = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'application/vnd.ms-excel' })

/** Behaviour every MailingStore must have. */
export function describeMailingStore(name: string, make: () => MailingStore | Promise<MailingStore>) {
  describe(`${name} (contract)`, () => {
    let store: MailingStore
    beforeEach(async () => {
      store = await make()
    })

    it('creates a mailing with status uploaded, revision 1 and a log entry', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      expect(m).toMatchObject({ code: 'CP-2026-1', status: 'uploaded', revision: 1, archived: false })
      expect(m.counts).toEqual({ addresses: 1246, formatIssuesOpen: null })
      expect(m.log.map((l) => l.event)).toEqual(['created'])
      expect(await store.get(m.id)).toEqual(m)
      expect(await store.findByCode('cp-2026-1')).toEqual(m)
    })

    it('keeps the source file', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const blob = await store.getSourceFile(m.id)
      expect(blob).not.toBeNull()
      expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    })

    it('refuses a code that exists, also when archived, case-insensitive', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      await store.archive(m.id, 'an@x.be')
      await expect(store.create(newInput('cp-2026-1'), file(), 'an@x.be')).rejects.toBeInstanceOf(CodeTakenError)
    })

    it('updates with the right revision and refuses an old one', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const m2 = await store.update(
        m.id,
        { status: 'mapped', mapping: { order: ['A'], roles: { A: 'name' } } },
        1,
        'bo@x.be',
        'mapped',
      )
      expect(m2).toMatchObject({ revision: 2, status: 'mapped', modified: { by: 'bo@x.be' } })
      expect(m2.log.at(-1)?.event).toBe('mapped')
      const err = await store.update(m.id, { title: 'Oud' }, 1, 'an@x.be', 'edited').catch((e) => e)
      expect(err).toBeInstanceOf(RevisionConflictError)
      expect((err as RevisionConflictError).current.revision).toBe(2)
      expect((await store.get(m.id))?.title).toBe('Nieuwsbrief')
    })

    it('archives and restores; the list shows both, with archived flag', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      await store.create(newInput('CP-2026-2'), file(), 'an@x.be')
      await store.archive(m.id, 'an@x.be')
      let items = await store.list()
      expect(items).toHaveLength(2)
      expect(items.find((i) => i.ok && i.summary.id === m.id)).toMatchObject({ ok: true, summary: { archived: true } })
      await store.restore(m.id, 'an@x.be')
      items = await store.list()
      expect(items.every((i) => i.ok && !i.summary.archived)).toBe(true)
    })

    it('throws MailingNotFoundError for an unknown id', async () => {
      expect(await store.get('nope')).toBeNull()
      await expect(store.update('nope', {}, 1, 'a', 'x')).rejects.toBeInstanceOf(MailingNotFoundError)
    })

    it('keeps files per mailing under a path, lists them by prefix, overwrites', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const other = await store.create(newInput('CP-2026-2'), file(), 'an@x.be')
      const xml = (text: string) => new Blob([new TextEncoder().encode(text)], { type: 'application/xml' })
      await store.saveFile(m.id, 'e-masspost/B_2RS.XML', xml('b'))
      await store.saveFile(m.id, 'e-masspost/A_0RQ.XML', xml('a'))
      await store.saveFile(other.id, 'e-masspost/C_0RQ.XML', xml('c'))
      expect(await store.listFiles(m.id, 'e-masspost/')).toEqual(['e-masspost/A_0RQ.XML', 'e-masspost/B_2RS.XML'])
      await store.saveFile(m.id, 'e-masspost/A_0RQ.XML', xml('a2'))
      expect(await (await store.getFile(m.id, 'e-masspost/A_0RQ.XML'))!.text()).toBe('a2')
      expect(await store.getFile(m.id, 'e-masspost/none.XML')).toBeNull()
      await expect(store.saveFile('nope', 'e-masspost/x', xml('x'))).rejects.toBeInstanceOf(MailingNotFoundError)
    })
  })
}

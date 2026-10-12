import { describe, it, expect } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { IndexedDbMailingStore } from '@/core/masspost/store/indexeddb-store'
import { CodeTakenError, RevisionConflictError, StoreUnavailableError } from '@/core/masspost/store/mailing-store'
import { describeMailingStore, newInput } from './mailing-store-contract'

describeMailingStore('IndexedDbMailingStore', () => new IndexedDbMailingStore({ indexedDB: new IDBFactory() }))

const file = () => new Blob([new Uint8Array([9])])

describe('IndexedDbMailingStore', () => {
  it('shows a broken mailing as unreadable, and the others normally', async () => {
    const factory = new IDBFactory()
    const store = new IndexedDbMailingStore({ indexedDB: factory })
    const good = await store.create(newInput(), file(), 'a@x.be')
    // Write a broken record next to it, as an older app version could have.
    await new Promise<void>((resolve, reject) => {
      const open = factory.open('bpost-e-masspost', 1)
      open.onsuccess = () => {
        const tx = open.result.transaction('mailings', 'readwrite')
        tx.objectStore('mailings').put({ id: 'broken', schemaVersion: 99 })
        tx.oncomplete = () => {
          open.result.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
    const items = await store.list()
    expect(items).toContainEqual({ ok: false, id: 'broken' })
    expect(items).toContainEqual(expect.objectContaining({ ok: true, summary: expect.objectContaining({ id: good.id }) }))
  })

  it('keeps the code of an unreadable mailing taken, and gives it in the list', async () => {
    const factory = new IDBFactory()
    const store = new IndexedDbMailingStore({ indexedDB: factory })
    await store.list() // creates the database
    await new Promise<void>((resolve, reject) => {
      const open = factory.open('bpost-e-masspost', 1)
      open.onsuccess = () => {
        const tx = open.result.transaction('mailings', 'readwrite')
        tx.objectStore('mailings').put({ id: 'broken', schemaVersion: 99, code: newInput().details.code })
        tx.oncomplete = () => {
          open.result.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
    expect(await store.list()).toContainEqual({ ok: false, id: 'broken', code: newInput().details.code })
    await expect(store.create(newInput(), file(), 'a@x.be')).rejects.toBeInstanceOf(CodeTakenError)
  })

  it('a second store on the same database sees the change and refuses its old revision', async () => {
    const factory = new IDBFactory()
    const tabA = new IndexedDbMailingStore({ indexedDB: factory })
    const tabB = new IndexedDbMailingStore({ indexedDB: factory })
    const m = await tabA.create(newInput(), file(), 'a@x.be')
    await tabA.update(m.id, { title: 'A' }, 1, 'a@x.be', 'edited')
    await expect(tabB.update(m.id, { title: 'B' }, 1, 'b@x.be', 'edited')).rejects.toBeInstanceOf(RevisionConflictError)
  })

  it('throws StoreUnavailableError when IndexedDB is missing', async () => {
    const store = new IndexedDbMailingStore({ indexedDB: undefined })
    await expect(store.list()).rejects.toBeInstanceOf(StoreUnavailableError)
  })
})

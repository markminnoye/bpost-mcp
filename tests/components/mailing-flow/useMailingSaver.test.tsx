// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import { StoreFullError, type MailingStore } from '@/core/masspost/store/mailing-store'
import { MailingStoreContext } from '@/components/mailings/MailingStoreProvider'
import { restoreUnsavedChange, useMailingSaver } from '@/components/mailing-flow/useMailingSaver'
import { newInput } from '../../core/masspost/store/mailing-store-contract'

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

/** A store whose first update fails, as when the browser storage is briefly unavailable. */
class FlakyStore extends MemoryMailingStore {
  failNext = true
  override async update(...args: Parameters<MailingStore['update']>) {
    if (this.failNext) {
      this.failNext = false
      throw new Error('storage hiccup')
    }
    return super.update(...args)
  }
}

describe('useMailingSaver', () => {
  it('does not write an older failed change over a newer saved one', async () => {
    const store = new FlakyStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result } = renderHook(() => useMailingSaver(mailing), { wrapper })

    await act(async () => {
      result.current.saveSoon({ corrections: { '2:name': 'oud' } }, 'format-edited')
      const first = result.current.flush() // fails: the older change waits again
      const second = result.current.save({ corrections: { '2:name': 'nieuw' } }, 'format-edited') // succeeds
      await Promise.all([first, second])
    })
    await act(async () => {
      await result.current.flush()
    })

    expect((await store.get(mailing.id))?.corrections).toEqual({ '2:name': 'nieuw' })
  })

  it('knows when something is not saved yet, so leaving the page can save first', async () => {
    const store = new MemoryMailingStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result } = renderHook(() => useMailingSaver(mailing), { wrapper })
    expect(result.current.hasUnsaved()).toBe(false)
    act(() => result.current.saveSoon({ excludedRows: [4] }, 'format-edited'))
    expect(result.current.hasUnsaved()).toBe(true)
    await act(async () => {
      await result.current.flush()
    })
    expect(result.current.hasUnsaved()).toBe(false)
    expect((await store.get(mailing.id))?.excludedRows).toEqual([4])
  })

  it('saves a waiting change right away when the page is hidden (reload, closing the tab)', async () => {
    const store = new MemoryMailingStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result } = renderHook(() => useMailingSaver(mailing), { wrapper })
    act(() => result.current.saveSoon({ excludedRows: [7] }, 'format-edited'))
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect((await store.get(mailing.id))?.excludedRows).toEqual([7])
  })

  it('tells when saving failed because the storage is full', async () => {
    class FullStore extends MemoryMailingStore {
      override async update(): Promise<never> {
        throw new StoreFullError()
      }
    }
    const store = new FullStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result } = renderHook(() => useMailingSaver(mailing), { wrapper })
    await act(async () => {
      await result.current.save({ excludedRows: [1] }, 'format-edited')
    })
    expect(result.current.state).toBe('error')
    expect(result.current.full).toBe(true)
  })

  it('keeps a waiting change through a reload of the tab, and saves it when the mailing opens again', async () => {
    /** On a reload the write to IndexedDB never finishes: the next write after `hangNext` hangs. */
    class ReloadStore extends MemoryMailingStore {
      hangNext = false
      override update(...args: Parameters<MailingStore['update']>) {
        if (!this.hangNext) return super.update(...args)
        this.hangNext = false
        return new Promise<never>(() => {})
      }
    }
    const store = new ReloadStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result, unmount } = renderHook(() => useMailingSaver(mailing), { wrapper })
    act(() => result.current.saveSoon({ excludedRows: [9] }, 'format-edited'))
    store.hangNext = true
    unmount() // the page goes away before the 2 s are over; its write does not finish
    const opened = await restoreUnsavedChange(store, (await store.get(mailing.id))!, 'an@x.be')
    expect(opened.excludedRows).toEqual([9])
    // Once saved, nothing is left for the next time.
    const again = await restoreUnsavedChange(store, opened, 'an@x.be')
    expect(again.revision).toBe(opened.revision)
  })

  it('drops the leftover when someone saved the mailing in the meantime', async () => {
    const store = new MemoryMailingStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    sessionStorage.setItem(`bpost-e-masspost:unsaved:${mailing.id}`, JSON.stringify({ revision: 0, change: { excludedRows: [3] }, event: 'x' }))
    const opened = await restoreUnsavedChange(store, mailing, 'an@x.be')
    expect(opened.excludedRows).toEqual([])
    expect(sessionStorage.getItem(`bpost-e-masspost:unsaved:${mailing.id}`)).toBeNull()
  })

  it('keeps a change made while a save is on its way: it is newer, not a failed leftover', async () => {
    /** A store whose update waits until the test lets it go. */
    class SlowStore extends MemoryMailingStore {
      release: (() => void) | null = null
      override async update(...args: Parameters<MailingStore['update']>) {
        if (!this.release) await new Promise<void>((resolve) => (this.release = resolve))
        return super.update(...args)
      }
    }
    const store = new SlowStore()
    const mailing = await store.create(newInput(), new Blob([]), 'an@x.be')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
    )
    const { result } = renderHook(() => useMailingSaver(mailing), { wrapper })
    await act(async () => {
      const first = result.current.save({ counts: { addresses: 10, formatIssuesOpen: 2 } }, 'format-checked')
      await new Promise((r) => setTimeout(r, 0))
      result.current.saveSoon({ counts: { addresses: 10, formatIssuesOpen: 0 } }, 'format-edited') // newer
      store.release?.()
      await first
    })
    expect(result.current.state).toBe('saved')
    await act(async () => {
      await result.current.flush()
    })
    expect((await store.get(mailing.id))?.counts.formatIssuesOpen).toBe(0)
  })
})

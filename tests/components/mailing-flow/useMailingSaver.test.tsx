// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import type { MailingStore } from '@/core/masspost/store/mailing-store'
import { MailingStoreContext } from '@/components/mailings/MailingStoreProvider'
import { useMailingSaver } from '@/components/mailing-flow/useMailingSaver'
import { newInput } from '../../core/masspost/store/mailing-store-contract'

afterEach(cleanup)

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
})

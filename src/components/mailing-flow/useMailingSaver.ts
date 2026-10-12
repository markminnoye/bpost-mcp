'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Mailing } from '@/core/masspost/store/mailing'
import { RevisionConflictError, StoreFullError, type MailingChange } from '@/core/masspost/store/mailing-store'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'

/** What `useMailingSaver` returns. */
export interface MailingSaver {
  /** The mailing as last saved. */
  mailing: Mailing
  /** Saves now, together with anything still waiting. */
  save: (change: MailingChange, event: string) => Promise<void>
  /** Saves 2 s after the last call (corrections in the format step). */
  saveSoon: (change: MailingChange, event: string) => void
  /** `error`: saving failed, the change waits; `conflict`: someone else saved in the meantime. */
  state: 'saved' | 'saving' | 'error' | 'conflict'
  /** With `error`: the last save failed because the browser's storage is full. */
  full: boolean
  /** Tries the waiting change again. */
  retry: () => Promise<void>
  /** Saves what is waiting right away. */
  flush: () => Promise<void>
  /** True while a change waits or the last save failed. Read at the moment it is called. */
  hasUnsaved: () => boolean
}

/**
 * Saves a mailing through the store, with the revision check (SR-112 §1, "Twee mensen tegelijk").
 * Leaving the page with an unsaved change asks first.
 * @param initial The mailing as loaded.
 * @returns The saver.
 */
export function useMailingSaver(initial: Mailing): MailingSaver {
  const { store, user } = useMailingStore()
  const [mailing, setMailing] = useState(initial)
  const [state, setStateValue] = useState<MailingSaver['state']>('saved')
  const [full, setFull] = useState(false)
  const stateRef = useRef<MailingSaver['state']>('saved')
  const setState = useCallback((next: MailingSaver['state']) => {
    stateRef.current = next
    setStateValue(next)
  }, [])
  const current = useRef(initial)
  const pending = useRef<{ change: MailingChange; event: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())

  // One save at a time, in order: each one needs the revision of the one before.
  const run = useCallback(
    (change: MailingChange, event: string) => {
      const next = queue.current.then(async () => {
        setState('saving')
        try {
          const saved = await store.update(current.current.id, change, current.current.revision, user.email, event)
          current.current = saved
          setMailing(saved)
          // A change that failed earlier and still waits is older than this one: drop the fields
          // this save already wrote, so it cannot overwrite them later.
          if (pending.current) {
            const rest = Object.fromEntries(
              Object.entries(pending.current.change).filter(([key]) => !(key in change)),
            ) as MailingChange
            pending.current = Object.keys(rest).length ? { ...pending.current, change: rest } : null
          }
          setFull(false)
          setState(pending.current ? 'error' : 'saved')
        } catch (e) {
          pending.current = { change: { ...change, ...pending.current?.change }, event }
          setFull(e instanceof StoreFullError)
          setState(e instanceof RevisionConflictError ? 'conflict' : 'error')
        }
      })
      queue.current = next
      return next
    },
    [store, user.email, setState],
  )

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const p = pending.current
    if (!p) return
    pending.current = null
    await run(p.change, p.event)
  }, [run])

  const save = useCallback(
    async (change: MailingChange, event: string) => {
      clearTimeout(timer.current)
      const merged = { ...pending.current?.change, ...change }
      pending.current = null
      await run(merged, event)
    },
    [run],
  )

  const saveSoon = useCallback(
    (change: MailingChange, event: string) => {
      pending.current = { change: { ...pending.current?.change, ...change }, event }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 2000)
    },
    [flush],
  )

  // Leaving with something unsaved: ask first.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || state === 'error' || state === 'conflict') e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state])

  // Reloading, closing the tab or switching away: save what waits right away, not after 2 s.
  // The browser usually finishes a write started here; the question on leaving stays as a backstop.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && pending.current) void flush()
    }
    const onPageHide = () => {
      if (pending.current) void flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [flush])

  // Leaving within the app (sidebar): save what is waiting.
  useEffect(() => () => void flush(), [flush])

  const hasUnsaved = useCallback(
    () => pending.current !== null || stateRef.current === 'error' || stateRef.current === 'conflict',
    [],
  )

  return useMemo(
    () => ({ mailing, save, saveSoon, state, full, retry: flush, flush, hasUnsaved }),
    [mailing, save, saveSoon, state, full, flush, hasUnsaved],
  )
}

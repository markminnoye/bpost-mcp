'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Mailing } from '@/core/masspost/store/mailing'
import {
  RevisionConflictError,
  StoreFullError,
  type MailingChange,
  type MailingStore,
} from '@/core/masspost/store/mailing-store'
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

type Unsaved = { change: MailingChange; event: string }

// What is not saved yet also goes to sessionStorage, at once: a write to IndexedDB that starts while
// the page reloads does not finish, but sessionStorage survives the reload of this tab.
const unsavedKey = (id: string) => `bpost-e-masspost:unsaved:${id}`

function writeUnsaved(id: string, revision: number, unsaved: Unsaved): void {
  try {
    sessionStorage.setItem(unsavedKey(id), JSON.stringify({ revision, ...unsaved }))
  } catch {
    // No sessionStorage (private window, full): the question on leaving stays.
  }
}

function clearUnsaved(id: string): void {
  try {
    sessionStorage.removeItem(unsavedKey(id))
  } catch {
    // Nothing to clear.
  }
}

/**
 * Saves what was not saved yet when this tab reloaded, before the mailing opens. Only when nobody
 * saved the mailing in the meantime (same revision); otherwise the leftover is dropped.
 * @param store The store.
 * @param mailing The mailing as loaded.
 * @param by E-mail of the user.
 * @returns The mailing with the leftover saved, or as loaded.
 */
export async function restoreUnsavedChange(store: MailingStore, mailing: Mailing, by: string): Promise<Mailing> {
  let entry: ({ revision: number } & Unsaved) | null = null
  try {
    entry = JSON.parse(sessionStorage.getItem(unsavedKey(mailing.id)) ?? 'null')
  } catch {
    return mailing
  }
  if (!entry) return mailing
  clearUnsaved(mailing.id)
  if (entry.revision !== mailing.revision) return mailing
  try {
    return await store.update(mailing.id, entry.change, mailing.revision, by, entry.event)
  } catch {
    return mailing
  }
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
  // What waits to be saved. `seq` per field: when it was set, so a save can tell a newer change (keep it)
  // from an older one that failed (drop the fields the save just wrote).
  const pending = useRef<{ change: MailingChange; event: string; seq: Record<string, number> } | null>(null)
  const counter = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())
  // Everything since the last moment all was saved, as final values (applying it twice is harmless).
  const unsaved = useRef<Unsaved | null>(null)
  const running = useRef(0)

  const remember = useCallback((change: MailingChange, event: string) => {
    unsaved.current = { change: { ...unsaved.current?.change, ...change }, event }
    writeUnsaved(current.current.id, current.current.revision, unsaved.current)
  }, [])

  /** Adds a change to what waits, each field stamped with `seq` (a new one by default). */
  const addPending = useCallback((change: MailingChange, event: string, seq = ++counter.current) => {
    const stamps = Object.fromEntries(Object.keys(change).map((key) => [key, seq]))
    pending.current = {
      change: { ...pending.current?.change, ...change },
      event,
      seq: { ...pending.current?.seq, ...stamps },
    }
  }, [])

  // One save at a time, in order: each one needs the revision of the one before.
  const run = useCallback(
    (change: MailingChange, event: string) => {
      running.current += 1
      const runSeq = ++counter.current
      const next = queue.current.then(async () => {
        setState('saving')
        try {
          const saved = await store.update(current.current.id, change, current.current.revision, user.email, event)
          current.current = saved
          setMailing(saved)
          running.current -= 1
          // What still waits: a field set after this save started is newer, so it stays. A field from
          // a change that failed before is older: drop it where this save already wrote that field.
          let failedLeft = false
          if (pending.current) {
            const p = pending.current
            const keep = Object.keys(p.change).filter((key) => !(key in change) || p.seq[key] > runSeq)
            failedLeft = keep.some((key) => p.seq[key] < runSeq)
            pending.current = keep.length
              ? {
                  ...p,
                  change: Object.fromEntries(keep.map((key) => [key, p.change[key as keyof MailingChange]])) as MailingChange,
                  seq: Object.fromEntries(keep.map((key) => [key, p.seq[key]])),
                }
              : null
          }
          if (!pending.current && running.current === 0) {
            unsaved.current = null
            clearUnsaved(saved.id)
          } else if (unsaved.current) {
            writeUnsaved(saved.id, saved.revision, unsaved.current)
          }
          setFull(false)
          setState(failedLeft ? 'error' : 'saved')
        } catch (e) {
          running.current -= 1
          // The failed change waits again, below anything newer that waits already (newer wins per field).
          const newer = pending.current
          const stamps = Object.fromEntries(Object.keys(change).map((key) => [key, runSeq]))
          pending.current = { change: { ...change, ...newer?.change }, event, seq: { ...stamps, ...newer?.seq } }
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
      remember(change, event)
      const merged = { ...pending.current?.change, ...change }
      pending.current = null
      await run(merged, event)
    },
    [run, remember],
  )

  const saveSoon = useCallback(
    (change: MailingChange, event: string) => {
      addPending(change, event)
      remember(change, event)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 2000)
    },
    [flush, remember, addPending],
  )

  // Leaving with something unsaved: ask first.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || state === 'error' || state === 'conflict') e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state])

  // Switching away (another tab or app) or into the back-forward cache: save what waits right away,
  // not after 2 s. A reload does not let this write finish: sessionStorage covers that case
  // (`restoreUnsavedChange`), and the question on leaving stays as a backstop.
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

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { BpostIds } from '@/core/masspost/request-file'
import type { Mailing } from '@/core/masspost/store/mailing'
import { StoreUnavailableError, UnreadableMailingError } from '@/core/masspost/store/mailing-store'
import { PageHeader } from '@/components/app-shell/AppShell'
import { STORE_UNAVAILABLE_MESSAGE, useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { LoadedList } from './columns'
import { friendlyReadError, nextPaint } from './FileDrop'
import { MailingFlow } from './MailingFlow'
import { Spinner } from './StatusIcons'
import { useLeaveGuard } from './useLeaveGuard'
import { restoreUnsavedChange, useMailingSaver } from './useMailingSaver'
import styles from '@/components/app-shell/app.module.css'

type Load =
  | { state: 'loading' }
  | { state: 'missing' | 'unreadable' | 'unavailable' }
  | { state: 'error'; message: string }
  | { state: 'ok'; mailing: Mailing; list: LoadedList; bytes: ArrayBuffer }

/**
 * One mailing: its flow, resumed at the furthest valid step, or on step 1 (its details).
 * @param props The code from the URL, whether to open on step 1, and the flow options.
 */
export function MailingPage({
  code,
  editDetails,
  docsUrl,
  aiModel,
  bpost = null,
}: {
  code: string
  editDetails: boolean
  docsUrl?: string
  aiModel?: string
  /** The bpost numbers of the tenant (no password), for the XML of step 4. */
  bpost?: BpostIds | null
}) {
  const { store, user } = useMailingStore()
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    setLoad({ state: 'loading' })
    ;(async () => {
      try {
        const found = await store.findByCode(code)
        if (!found) return alive && setLoad({ state: 'missing' })
        // What this tab had not saved yet before a reload, first.
        const mailing = await restoreUnsavedChange(store, found, user.email)
        const blob = await store.getSourceFile(mailing.id)
        if (!blob) return alive && setLoad({ state: 'error', message: 'De adreslijst van deze mailing is niet meer in je browser.' })
        await nextPaint()
        const bytes = await blob.arrayBuffer()
        const { parseExcelAddresses } = await import('@/core/masspost/excel')
        const parsed = await parseExcelAddresses(bytes)
        if (alive) setLoad({ state: 'ok', mailing, list: { fileName: mailing.source.name, ...parsed }, bytes })
      } catch (e) {
        if (!alive) return
        if (e instanceof UnreadableMailingError) setLoad({ state: 'unreadable' })
        else if (e instanceof StoreUnavailableError) setLoad({ state: 'unavailable' })
        else setLoad({ state: 'error', message: friendlyReadError(e) })
      }
    })()
    return () => {
      alive = false
    }
  }, [store, code, user.email])

  if (load.state === 'loading') {
    return (
      <div className={styles.page} aria-busy="true">
        <PageHeader title="Mailing openen" />
        <div className={styles.filecard} role="status">
          <Spinner />
          <div>
            <b>We openen de mailing…</b>
            <span className={styles.muted}>We lezen je adreslijst opnieuw in.</span>
          </div>
        </div>
      </div>
    )
  }
  if (load.state !== 'ok') {
    const text = {
      missing: ['Deze mailing bestaat niet (meer)', `We vinden geen mailing met de code ${code} in deze browser.`],
      unreadable: ['Kan deze mailing niet lezen', 'De gegevens van deze mailing zijn beschadigd of komen van een andere versie.'],
      unavailable: ['We kunnen je mailings hier niet openen', STORE_UNAVAILABLE_MESSAGE],
      error: ['Deze mailing openen lukte niet', load.state === 'error' ? load.message : ''],
    }[load.state]
    return (
      <div className={styles.page}>
        <PageHeader title={text[0]} />
        <div className={`${styles.box} ${styles.state}`} role="alert">
          <p>{text[1]}</p>
          <Link className={styles.btn} href="/mailings">
            Naar Mailings
          </Link>
        </div>
      </div>
    )
  }
  return (
    <OpenMailing
      mailing={load.mailing}
      list={load.list}
      bytes={load.bytes}
      startOnDetails={editDetails}
      docsUrl={docsUrl}
      aiModel={aiModel}
      bpost={bpost}
    />
  )
}

function OpenMailing({
  mailing,
  list,
  bytes,
  startOnDetails,
  docsUrl,
  aiModel,
  bpost,
}: {
  mailing: Mailing
  list: LoadedList
  bytes: ArrayBuffer
  startOnDetails: boolean
  docsUrl?: string
  aiModel?: string
  bpost: BpostIds | null
}) {
  const saver = useMailingSaver(mailing)
  const router = useRouter()
  const [blocked, setBlocked] = useState<string | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  // Step 1 with an empty required field: that change cannot be saved, so leaving asks first.
  const detailsIncomplete = useRef(false)
  const unsaved = () => saver.hasUnsaved() || detailsIncomplete.current

  // `?stap=gegevens` only picks the first step; the address stays that of the mailing.
  useEffect(() => {
    if (startOnDetails) history.replaceState(history.state, '', location.pathname)
  }, [startOnDetails])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (detailsIncomplete.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  /** Leaving the mailing: save what waits first; if that fails, ask (SR-112 §6, "Bewaren mislukt"). */
  async function leave(to: string) {
    await saver.flush()
    if (unsaved()) setBlocked(to)
    else router.push(to)
  }
  useLeaveGuard(unsaved, (to) => void leave(to))

  useEffect(() => {
    if (blocked && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [blocked])

  return (
    <div className={styles.page}>
      <MailingFlow
        mailing={mailing}
        list={list}
        fileBytes={bytes}
        saver={saver}
        title={
          <>
            {saver.mailing.title} <span className={styles.code}>{saver.mailing.code}</span>
          </>
        }
        docsUrl={docsUrl}
        aiModel={aiModel}
        startOnDetails={startOnDetails}
        bpost={bpost}
        onDetailsIncomplete={(incomplete) => {
          detailsIncomplete.current = incomplete
        }}
      />
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="unsaved-title" onClose={() => setBlocked(null)}>
        <h2 id="unsaved-title">Nog niet bewaard</h2>
        <p>Je laatste wijzigingen zijn nog niet bewaard. Als je nu weggaat, ben je ze kwijt.</p>
        <div className={styles.dialogFoot}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              const to = blocked
              dialog.current?.close()
              if (to) router.push(to)
            }}
          >
            Weggaan
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => dialog.current?.close()}>
            Blijven
          </button>
        </div>
      </dialog>
    </div>
  )
}

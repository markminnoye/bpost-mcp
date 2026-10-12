'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconArchive, IconDots, IconPencil } from '@tabler/icons-react'
import type { Mailing } from '@/core/masspost/store/mailing'
import { StoreUnavailableError, UnreadableMailingError } from '@/core/masspost/store/mailing-store'
import { PageHeader } from '@/components/app-shell/AppShell'
import { STORE_UNAVAILABLE_MESSAGE, useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { LoadedList } from './columns'
import { friendlyReadError, nextPaint } from './FileDrop'
import { ImportStep } from './ImportStep'
import { MailingFlow } from './MailingFlow'
import { Spinner } from './StatusIcons'
import { useLeaveGuard } from './useLeaveGuard'
import { useMailingSaver } from './useMailingSaver'
import styles from '@/components/app-shell/app.module.css'

type Load =
  | { state: 'loading' }
  | { state: 'missing' | 'unreadable' | 'unavailable' }
  | { state: 'error'; message: string }
  | { state: 'ok'; forEdit: boolean; mailing: Mailing; list?: LoadedList; bytes?: ArrayBuffer }

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true } as const

/**
 * One mailing: its flow (resumed at the furthest valid step), or step 1 to change its details.
 * @param props The code from the URL, whether to show step 1, and the flow options.
 */
export function MailingPage({
  code,
  editDetails,
  docsUrl,
  aiModel,
}: {
  code: string
  editDetails: boolean
  docsUrl?: string
  aiModel?: string
}) {
  const { store } = useMailingStore()
  const [load, setLoad] = useState<Load>({ state: 'loading' })

  useEffect(() => {
    let alive = true
    setLoad({ state: 'loading' })
    ;(async () => {
      try {
        const mailing = await store.findByCode(code)
        if (!mailing) return alive && setLoad({ state: 'missing' })
        if (editDetails) return alive && setLoad({ state: 'ok', forEdit: true, mailing })
        const blob = await store.getSourceFile(mailing.id)
        if (!blob) return alive && setLoad({ state: 'error', message: 'De adreslijst van deze mailing is niet meer in je browser.' })
        await nextPaint()
        const bytes = await blob.arrayBuffer()
        const { parseExcelAddresses } = await import('@/core/masspost/excel')
        const parsed = await parseExcelAddresses(bytes)
        if (alive) setLoad({ state: 'ok', forEdit: false, mailing, list: { fileName: mailing.source.name, ...parsed }, bytes })
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
  }, [store, code, editDetails])

  // The page stays mounted when only `?stap=` changes: until the new load is in, show the spinner.
  if (load.state === 'loading' || (load.state === 'ok' && load.forEdit !== editDetails)) {
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
  if (editDetails) return <ImportStep mode="edit" mailing={load.mailing} />
  return <OpenMailing mailing={load.mailing} list={load.list!} bytes={load.bytes!} docsUrl={docsUrl} aiModel={aiModel} />
}

function OpenMailing({
  mailing,
  list,
  bytes,
  docsUrl,
  aiModel,
}: {
  mailing: Mailing
  list: LoadedList
  bytes: ArrayBuffer
  docsUrl?: string
  aiModel?: string
}) {
  const saver = useMailingSaver(mailing)
  const router = useRouter()
  const { store, user } = useMailingStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const detailsHref = `/mailings/${encodeURIComponent(mailing.code)}?stap=gegevens`

  /** Leaving the mailing: save what waits first; if that fails, ask (SR-112 §6, "Bewaren mislukt"). */
  async function leave(to: string) {
    await saver.flush()
    if (saver.hasUnsaved()) setBlocked(to)
    else router.push(to)
  }
  useLeaveGuard(saver.hasUnsaved, (to) => void leave(to))

  useEffect(() => {
    if (blocked && dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [blocked])

  useEffect(() => {
    if (!menuOpen) return
    wrap.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  async function archive() {
    setMenuOpen(false)
    await saver.flush()
    await store.archive(mailing.id, user.email)
    router.push('/archief')
  }

  const header = (
    <PageHeader
      title={
        <>
          {saver.mailing.title} <span className={styles.code}>{saver.mailing.code}</span>
        </>
      }
      actions={
        <div className={styles.menuWrap} ref={wrap}>
          <button
            type="button"
            className={styles.more}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Acties voor ${mailing.code}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <IconDots {...ICON} />
          </button>
          {menuOpen && (
            <div
              className={styles.menu}
              role="menu"
              aria-label={`Acties voor ${mailing.code}`}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setMenuOpen(false)
              }}
            >
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  setMenuOpen(false)
                  void leave(detailsHref)
                }}
              >
                <IconPencil {...ICON} />
                Gegevens aanpassen
              </button>
              <button type="button" role="menuitem" className={styles.menuItem} onClick={() => void archive()}>
                <IconArchive {...ICON} />
                Archiveren
              </button>
            </div>
          )}
        </div>
      }
    />
  )

  return (
    <div className={styles.page}>
      <MailingFlow
        mailing={mailing}
        list={list}
        fileBytes={bytes}
        saver={saver}
        header={header}
        docsUrl={docsUrl}
        aiModel={aiModel}
        onEditDetails={() => void leave(detailsHref)}
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

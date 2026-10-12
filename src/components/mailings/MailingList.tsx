'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { IconArchive, IconChevronDown, IconLayoutList, IconList, IconMail, IconPlus, IconSearch } from '@tabler/icons-react'
import { sortMailings, type MailingSort, type MailingSummary } from '@/core/masspost/store/mailing'
import { StoreUnavailableError, type MailingListItem } from '@/core/masspost/store/mailing-store'
import { PageHeader } from '@/components/app-shell/AppShell'
import { useStoredPreference } from '@/components/app-shell/useStoredPreference'
import { savePrinterFileForMailing } from '@/components/mailing-flow/exports'
import { filterMailings } from './labels'
import { MailingRow } from './MailingRow'
import { STORE_UNAVAILABLE_MESSAGE, useMailingStore } from './MailingStoreProvider'
import styles from '@/components/app-shell/app.module.css'

const ICON = { size: 18, stroke: 1.75, 'aria-hidden': true } as const

const SORTS: { id: MailingSort; label: string; hint?: string }[] = [
  { id: 'status', label: 'Status', hint: 'actie nodig eerst' },
  { id: 'date', label: 'Afgiftedatum', hint: 'vroegste eerst' },
  { id: 'modified', label: 'Laatst gewijzigd', hint: 'recentste eerst' },
  { id: 'code', label: 'Code', hint: 'nieuwste eerst' },
  { id: 'title', label: 'Titel (A–Z)' },
]
const SORT_IDS = SORTS.map((s) => s.id)

/** Below this width of the list, rows always take two lines (SR-112 §4). */
const NARROW = 860

type Load = { state: 'loading' } | { state: 'error'; unavailable: boolean } | { state: 'ok'; items: MailingListItem[] }

/**
 * The list of mailings, or of the archive (SR-112 §4): search, sort, view, the "…" menu with archive
 * and undo.
 * @param props Archive or not.
 */
export function MailingList({ archived }: { archived: boolean }) {
  const { store, user } = useMailingStore()
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [query, setQuery] = useState('')
  const [sort, setSort] = useStoredPreference<MailingSort>('sort', SORT_IDS, 'status')
  const [view, setView] = useStoredPreference('view', ['one', 'two'] as const, 'one')
  const [sortOpen, setSortOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const sortWrap = useRef<HTMLDivElement>(null)

  const reload = useCallback(async () => {
    try {
      setLoad({ state: 'ok', items: await store.list() })
    } catch (e) {
      setLoad({ state: 'error', unavailable: e instanceof StoreUnavailableError })
    }
  }, [store])

  useEffect(() => {
    void reload()
  }, [reload])

  // Two lines when the list is narrow (phone, narrow window).
  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW))
    observer.observe(el)
    return () => observer.disconnect()
  }, [load.state])

  // "/" puts the cursor in the search field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || target.closest('input, textarea, select, [contenteditable]')) return
      e.preventDefault()
      search.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!sortOpen) return
    sortWrap.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus()
    const onDown = (e: MouseEvent) => {
      if (!sortWrap.current?.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sortOpen])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(t)
  }, [toast])

  /** "Opslaan voor de drukker" from the menu: the same file as in step 4, made in the browser. */
  async function savePrinter(m: MailingSummary) {
    setToast({ text: `Bestand voor de drukker van ${m.code} wordt gemaakt…` })
    try {
      await savePrinterFileForMailing(store, m.id)
      setToast({ text: `Bestand voor de drukker van ${m.code} is opgeslagen` })
    } catch {
      setToast({ text: 'Het bestand maken lukte niet. Open de mailing en probeer het in stap 4.' })
    }
  }

  async function setArchived(m: MailingSummary, archive: boolean) {
    try {
      if (archive) await store.archive(m.id, user.email)
      else await store.restore(m.id, user.email)
    } catch {
      setToast({ text: 'Dat lukte niet. Probeer het opnieuw.' })
      return
    }
    await reload()
    setToast({
      text: archive ? `${m.code} is gearchiveerd` : `${m.code} staat terug bij Mailings`,
      undo: async () => {
        setToast(null)
        if (archive) await store.restore(m.id, user.email)
        else await store.archive(m.id, user.email)
        await reload()
      },
    })
  }

  const title = archived ? 'Archief' : 'Mailings'
  const newButton = !archived && (
    <Link href="/mailings/nieuw" className={`${styles.btn} ${styles.btnPrimary}`}>
      <IconPlus {...ICON} />
      Nieuwe mailing
    </Link>
  )

  if (load.state === 'error') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} />
        <div className={`${styles.box} ${styles.state}`} role="alert">
          <h2>{load.unavailable ? 'We kunnen je mailings hier niet bewaren' : 'We kunnen je mailings nu niet ophalen'}</h2>
          <p>{load.unavailable ? STORE_UNAVAILABLE_MESSAGE : 'Probeer het zo meteen opnieuw.'}</p>
          <button type="button" className={styles.btn} onClick={() => void reload()}>
            Opnieuw proberen
          </button>
        </div>
      </div>
    )
  }

  const all = load.state === 'ok' ? load.items : []
  const unreadable = archived ? [] : all.flatMap((i) => (i.ok ? [] : [i.id]))
  const own = all.flatMap((i) => (i.ok && i.summary.archived === archived ? [i.summary] : []))
  const rows = sortMailings(filterMailings(own, query), sort)
  const twoLines = narrow || view === 'two'
  const empty = load.state === 'ok' && own.length === 0 && unreadable.length === 0

  return (
    <div className={styles.page}>
      <PageHeader title={title} actions={newButton} />
      {!archived && <p className={styles.note}>Je mailings staan voorlopig enkel in deze browser.</p>}

      {!empty && (
        <div className={styles.search}>
          <IconSearch size={16} stroke={1.75} aria-hidden="true" />
          <input
            ref={search}
            type="search"
            aria-label="Zoek op code, titel of klant"
            placeholder="Zoek op code, titel of klant"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
          />
          <kbd aria-hidden="true">/</kbd>
        </div>
      )}

      <div ref={box} className={`${styles.box} ${twoLines ? styles.two : ''}`} aria-busy={load.state === 'loading'}>
        {empty ? (
          <div className={styles.state}>
            {archived ? (
              <>
                <IconArchive className={styles.stateIcon} size={32} stroke={1.5} aria-hidden="true" />
                <h2>Nog niets gearchiveerd</h2>
                <p>Hier komen de mailings die je archiveert.</p>
              </>
            ) : (
              <>
                <IconMail className={styles.stateIcon} size={32} stroke={1.5} aria-hidden="true" />
                <h2>Nog geen mailings</h2>
                <p>Start je eerste mailing: geef ze een naam, kies je adreslijst, en wij kijken ze na op de regels van bpost.</p>
                {newButton}
              </>
            )}
          </div>
        ) : (
          <>
            <div className={styles.boxHead}>
              <span>
                {load.state === 'loading'
                  ? 'Mailings laden…'
                  : `${rows.length} ${rows.length === 1 ? 'mailing' : 'mailings'}${archived ? ' in het archief' : ''}`}
              </span>
              <div className={styles.menuWrap} ref={sortWrap}>
                <button
                  type="button"
                  className={styles.sortBtn}
                  aria-haspopup="menu"
                  aria-expanded={sortOpen}
                  onClick={() => setSortOpen(!sortOpen)}
                >
                  Sorteren: {SORTS.find((s) => s.id === sort)?.label}
                  <IconChevronDown size={14} stroke={1.75} aria-hidden="true" />
                </button>
                {sortOpen && (
                  <div
                    className={styles.menu}
                    role="menu"
                    aria-label="Sorteren op"
                    onKeyDown={(e) => {
                      const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=menuitemradio]')]
                      const i = items.indexOf(document.activeElement as HTMLElement)
                      if (e.key === 'Escape') setSortOpen(false)
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault()
                        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
                      }
                    }}
                  >
                    {SORTS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={s.id === sort}
                        className={styles.menuItem}
                        onClick={() => {
                          setSort(s.id)
                          setSortOpen(false)
                        }}
                      >
                        <span>
                          {s.label}
                          {s.hint && (
                            <span className={styles.hint} style={{ display: 'block' }}>
                              {s.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!narrow && (
                <div className={styles.seg} role="group" aria-label="Weergave">
                  <button type="button" aria-pressed={view === 'one'} aria-label="Eén regel per mailing" onClick={() => setView('one')}>
                    <IconList size={16} stroke={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" aria-pressed={view === 'two'} aria-label="Twee regels per mailing" onClick={() => setView('two')}>
                    <IconLayoutList size={16} stroke={1.75} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            {load.state === 'loading' &&
              [1, 2, 3].map((n) => <div key={n} className={styles.skel} aria-hidden="true" />)}
            {unreadable.map((id) => (
              <div key={id} className={styles.unreadable}>
                Kan deze mailing niet lezen.
              </div>
            ))}
            {load.state === 'ok' && rows.length === 0 && (
              <div className={styles.state}>
                <h2>Geen mailings gevonden</h2>
                <p>
                  {query.trim()
                    ? `Niets past bij “${query.trim()}”. Zoek op code, titel of klant.`
                    : 'Hier komen de mailings die je archiveert.'}
                </p>
              </div>
            )}
            {rows.map((m) => (
              <MailingRow
                key={m.id}
                mailing={m}
                twoLines={twoLines}
                onPrinter={() => void savePrinter(m)}
                onArchive={() => void setArchived(m, true)}
                onRestore={() => void setArchived(m, false)}
              />
            ))}
          </>
        )}
      </div>

      {toast && (
        <div className={styles.toast} role="status">
          {toast.text}
          {toast.undo && (
            <button type="button" onClick={toast.undo}>
              Ongedaan maken
            </button>
          )}
        </div>
      )}
    </div>
  )
}

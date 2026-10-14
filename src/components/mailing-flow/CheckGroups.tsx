'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent } from 'react'
import { IconChecks, IconChevronRight, IconMailOff } from '@tabler/icons-react'
import {
  CHECK_GROUPS,
  currentValue,
  isOpen,
  valueChanges,
  type CheckGroupId,
  type CheckRow,
  type CheckView,
} from '@/core/masspost/address-check'
import type { AddressField } from '@/core/masspost/mapping'
import { AddressRow, type AddressRowActions } from './AddressRow'
import { FIELD_LABELS, formatCount } from './columns'
import type { CorrectionAction, Corrections } from './corrections'
import { IconRows3 } from './StatusIcons'
import styles from './mailing-flow.module.css'

/** Rows visible while a group is closed and still has open addresses, as in the format step. */
const VISIBLE = 3
const PAGE = 100
const CONTEXT_FIELDS: readonly AddressField[] = ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country']

/**
 * The result of an address check in groups (sketch adrescontrole.html v4.6), in the style of the format
 * step: a pill with the open addresses per group ("(shown)/open" while rows are folded), a group that
 * closes once it is in order, "Alles overnemen" and "Alles uitsluiten", the keys and ⌘Z with a toast.
 * @param props The grouped result, the shared corrections and their dispatch, and whether step 4 is on screen.
 */
export function CheckGroups({
  view,
  corrections,
  dispatch,
  active,
}: {
  view: CheckView
  corrections: Corrections
  dispatch: Dispatch<CorrectionAction>
  active: boolean
}) {
  const state = corrections
  const [stops, setStops] = useState<Partial<Record<CheckGroupId, string>>>({})
  const [expanded, setExpanded] = useState<Partial<Record<CheckGroupId, boolean>>>({})
  const [shut, setShut] = useState<Partial<Record<CheckGroupId, boolean>>>({})
  const [pages, setPages] = useState<Partial<Record<CheckGroupId, number>>>({})
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const groupStates = useMemo(
    () =>
      CHECK_GROUPS.map((g) => {
        const rows = view.rows.filter((r) => r.group === g.id)
        const openRows = rows.filter((r) => isOpen(r, state.values, state.excluded))
        const withProp = rows.filter(
          (r) => !!r.proposal && !state.excluded[r.seq] && currentValue(r, state.values) === r.original,
        )
        // One row per address for "Alles uitsluiten": two fields of one address can both be open.
        const openPerAddress = [...new Map(openRows.map((r) => [r.seq, r])).values()]
        return { ...g, rows, open: openRows.length, openPerAddress, withProp }
      }).filter((g) => g.rows.length > 0 || (g.id === 'ok' && view.counts.ok > 0)),
    [view, state.values, state.excluded],
  )

  /** Closes a group: back to its first rows, or to the header alone when nothing is left to do. */
  const closeGroup = useCallback((group: CheckGroupId, resolved: boolean) => {
    setExpanded((s) => ({ ...s, [group]: false }))
    setShut((s) => ({ ...s, [group]: resolved }))
  }, [])

  // A group that becomes fully in order closes at once (before paint); undo opens it again.
  const wasResolved = useRef<Partial<Record<CheckGroupId, boolean>>>({})
  useLayoutEffect(() => {
    for (const group of groupStates) {
      if (group.id === 'ok' || group.id === 'note') continue
      const resolved = group.open === 0
      const was = wasResolved.current[group.id]
      wasResolved.current[group.id] = resolved
      if (was === undefined || was === resolved) continue
      if (!resolved) {
        setShut((s) => ({ ...s, [group.id]: false }))
        continue
      }
      const section = containerRef.current?.querySelector<HTMLElement>(`[data-group="${group.id}"]`)
      const focused = document.activeElement
      const focusInRows = !!section && !!focused && section.contains(focused) && !focused.closest('[data-head]')
      closeGroup(group.id, true)
      if (focusInRows) requestAnimationFrame(() => section.querySelector<HTMLElement>('[data-toggle]')?.focus())
    }
  }, [groupStates, closeGroup])

  // —— Focus and keyboard ——

  const navItems = useCallback(() => {
    const root = containerRef.current
    if (!root) return []
    return [...root.querySelectorAll<HTMLElement>('[data-nav]')].filter((el) => el.offsetParent !== null)
  }, [])

  const focusItem = useCallback((el: HTMLElement | undefined) => {
    if (!el) return
    if (el.dataset.key) {
      const group = el.closest<HTMLElement>('[data-group]')?.dataset.group as CheckGroupId | undefined
      if (group) setStops((s) => ({ ...s, [group]: el.dataset.key }))
    }
    el.focus()
  }, [])

  const actions = useMemo<AddressRowActions>(
    () => ({
      commit: (row, value) =>
        dispatch({
          type: 'apply',
          scope: 'check',
          changes: valueChanges(row, value).map((c) => ({ ...c, seq: row.seq })),
        }),
      toggleExclude: (row) => dispatch({ type: 'toggleExclude', scope: 'check', key: row.key, seq: row.seq }),
      focusRow: (row) => {
        const el = containerRef.current?.querySelector<HTMLElement>(`[data-key="${row.key}"]`)
        if (el && document.activeElement !== el && !el.contains(document.activeElement)) el.focus()
        const group = row.group
        setStops((s) => (s[group] === row.key ? s : { ...s, [group]: row.key }))
      },
      move: (from, delta) => {
        const items = navItems()
        if (delta === 'first') return focusItem(items[0])
        if (delta === 'last') return focusItem(items.at(-1))
        const i = items.indexOf(from)
        focusItem(items[Math.max(0, Math.min(items.length - 1, i + delta))])
      },
    }),
    [dispatch, navItems, focusItem],
  )

  function acceptGroup(rows: CheckRow[]) {
    const changes = rows.map((r) => ({ key: r.key, seq: r.seq, value: r.proposal }))
    if (changes.length === 0) return
    const n = changes.length
    setToast({ id: state.nextId, text: `${formatCount(n)} ${n === 1 ? 'voorstel' : 'voorstellen'} overgenomen` })
    dispatch({ type: 'apply', scope: 'check', changes })
  }

  function excludeGroup(rows: CheckRow[]) {
    const changes = rows.map((r) => ({ key: r.key, seq: r.seq, excluded: true }))
    if (changes.length === 0) return
    const n = changes.length
    setToast({ id: state.nextId, text: `${formatCount(n)} ${n === 1 ? 'rij' : 'rijen'} uitgesloten` })
    dispatch({ type: 'apply', scope: 'check', changes })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!active) return
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) {
        const last = state.undo.at(-1)
        if (!last || last.scope !== 'check') return
        e.preventDefault()
        if (toast?.id === last.id) setToast(null)
        dispatch({ type: 'undo', scope: 'check' })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, state.undo, toast, dispatch])

  function onToggleKeyDown(e: KeyboardEvent<HTMLElement>, group: CheckGroupId, resolved: boolean) {
    const key = e.key.toLowerCase()
    const mod = e.metaKey || e.ctrlKey || e.altKey
    if (e.key === 'ArrowDown' || (key === 'j' && !mod)) {
      e.preventDefault()
      actions.move(e.currentTarget, 1)
    } else if (e.key === 'ArrowUp' || (key === 'k' && !mod)) {
      e.preventDefault()
      actions.move(e.currentTarget, -1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setExpanded((s) => ({ ...s, [group]: true }))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      closeGroup(group, resolved)
    }
  }

  const contextOf = (row: CheckRow) =>
    CONTEXT_FIELDS.filter((f) => row.sent[f] !== undefined && (row.field === 'address' ? f !== 'streetHouseBox' && f !== 'postcodeCity' : f !== row.field))
      .map((f) => `${FIELD_LABELS[f].title}: ${state.values[`${row.seq}:${f}`] ?? row.sent[f]}`)
      .join(' · ')

  return (
    <div ref={containerRef}>
      <div className={styles.cols} aria-hidden="true">
        <span>Rij · veld</span>
        <span>Huidige waarde</span>
        <span />
        <span>Voorstel</span>
        <span />
        <span />
      </div>

      {groupStates.map((group) => {
        const isOk = group.id === 'ok'
        const isNote = group.id === 'note'
        const resolved = group.open === 0
        const isExpanded = !!expanded[group.id]
        const total = isOk ? view.counts.ok : group.rows.length
        const rows = isOk
          ? isExpanded
            ? group.rows.slice(0, VISIBLE)
            : []
          : isExpanded
            ? group.rows.slice(0, VISIBLE + (pages[group.id] ?? 1) * PAGE)
            : resolved && shut[group.id]
              ? []
              : group.rows.slice(0, VISIBLE)
        const canToggle = isOk ? group.rows.length > 0 : isExpanded || rows.length < group.rows.length
        const shownKeys = new Set(rows.map((r) => r.key))
        const saved = stops[group.id]
        const stop = saved && shownKeys.has(saved) ? saved : rows[0]?.key
        const openShown = rows.filter((r) => isOpen(r, state.values, state.excluded)).length
        const partly = !isOk && !isNote && !resolved && openShown < group.open
        const count = isOk || isNote || resolved ? formatCount(total) : partly ? `(${formatCount(openShown)})/${formatCount(group.open)}` : formatCount(group.open)
        const label = isOk
          ? `${formatCount(total)} adressen zonder opmerking van e-MassPost`
          : isNote
            ? `${formatCount(total)} ${total === 1 ? 'adres' : 'adressen'} met een opmerking. Ze tellen al mee als juist`
            : resolved
              ? `${total === 1 ? 'Het adres is' : `Alle ${formatCount(total)} adressen zijn`} in orde`
              : `${formatCount(group.open)} ${group.open === 1 ? 'adres' : 'adressen'} open${partly ? `, ${formatCount(openShown)} zichtbaar` : ''}`
        const hint = isExpanded ? 'Klik om de rijen te verbergen.' : isOk ? 'Klik om een paar voorbeelden te tonen.' : 'Klik om de rijen te tonen.'
        const pillClass = `${styles.pill} ${isNote ? '' : isOk || resolved ? styles.pillOkSoft : styles.pillWarn}`
        const pillBody = (
          <span className={styles.pillBody} data-pill="" aria-hidden="true">
            <IconRows3 />
            {count}
            {canToggle && <IconChevronRight className={styles.chev} size={12} stroke={2} />}
          </span>
        )
        return (
          <section key={group.id} data-group={group.id} aria-label={group.title}>
            <div className={styles.gh} data-head="">
              <h2 className={styles.gn}>{group.title}</h2>
              <div className={styles.tg}>
                {canToggle ? (
                  <button
                    type="button"
                    className={`${pillClass} ${styles.pillToggle}`}
                    data-toggle=""
                    data-nav=""
                    data-resolved={resolved ? '' : undefined}
                    data-tip={`${label}. ${hint}`}
                    aria-expanded={isExpanded}
                    aria-controls={`rows-${group.id}`}
                    onClick={() => (isExpanded ? closeGroup(group.id, resolved) : setExpanded((x) => ({ ...x, [group.id]: true })))}
                    onKeyDown={(e) => onToggleKeyDown(e, group.id, resolved)}
                  >
                    {pillBody}
                    <span className={styles.srOnly}>{label}</span>
                  </button>
                ) : (
                  <span className={pillClass} data-tip={label}>
                    {pillBody}
                    <span className={styles.srOnly}>{label}</span>
                  </span>
                )}
                {(group.id === 'noAddress' || group.id === 'multiple') && group.open > 0 && (
                  <button
                    type="button"
                    className={`${styles.b} ${styles.withIcon}`}
                    data-tip={`Sluit ${group.openPerAddress.length === 1 ? 'het adres' : `de ${formatCount(group.openPerAddress.length)} adressen`} uit die nog open ${group.openPerAddress.length === 1 ? 'staat' : 'staan'}. Ze blijven bewaard, maar gaan niet mee in de mailing.`}
                    onClick={() => excludeGroup(group.openPerAddress)}
                  >
                    <IconMailOff size={14} stroke={1.75} aria-hidden="true" />
                    Alles uitsluiten
                  </button>
                )}
                {group.id === 'proposal' && group.withProp.length > 0 && (
                  <button
                    type="button"
                    className={`${styles.b} ${styles.withIcon}`}
                    data-tip={
                      group.withProp.length === 1
                        ? 'Neem het voorstel over dat nog open staat.'
                        : `Neem de ${formatCount(group.withProp.length)} voorstellen over die nog open staan.`
                    }
                    onClick={() => acceptGroup(group.withProp)}
                  >
                    <IconChecks size={14} stroke={1.75} aria-hidden="true" />
                    Alles overnemen
                  </button>
                )}
              </div>
            </div>
            <div id={`rows-${group.id}`}>
              {isOk
                ? rows.map((r) => (
                    <div key={r.key} className={styles.okRow}>
                      <span className={styles.k}>
                        Rij {r.seq} · {r.field === 'address' ? 'adres' : FIELD_LABELS[r.field].short}
                      </span>
                      <span>{r.original}</span>
                    </div>
                  ))
                : rows.map((r) => (
                    <AddressRow
                      key={r.key}
                      row={r}
                      value={currentValue(r, state.values)}
                      excluded={!!state.excluded[r.seq]}
                      open={isOpen(r, state.values, state.excluded)}
                      context={contextOf(r)}
                      tabStop={stop === r.key}
                      actions={actions}
                    />
                  ))}
              {!isOk && isExpanded && rows.length < group.rows.length && (
                <div className={styles.more}>
                  <button
                    type="button"
                    className={styles.b}
                    onClick={() => setPages((p) => ({ ...p, [group.id]: (p[group.id] ?? 1) + 1 }))}
                  >
                    Toon nog {formatCount(Math.min(PAGE, group.rows.length - rows.length))} rijen
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      })}

      <p className={styles.kb}>
        <code>Tab</code> naar de volgende knop of groep rijen · <code>↑</code> <code>↓</code> rij kiezen · <code>→</code>{' '}
        <code>←</code> rijen tonen of verbergen · <code>Enter</code> voorstel overnemen, of adres kiezen · <code>E</code>{' '}
        aanpassen · tijdens het aanpassen: <code>Enter</code> bevestigen, <code>Esc</code> terugzetten · <code>X</code>{' '}
        uitsluiten of opnieuw opnemen · <code>⌘Z</code> laatste actie ongedaan maken
      </p>

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'undo', id: toast.id, scope: 'check' })
              setToast(null)
            }}
          >
            Ongedaan maken
          </button>
        </div>
      )}
    </div>
  )
}

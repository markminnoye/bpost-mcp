'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from 'react'
import { IconChevronRight, IconDownload } from '@tabler/icons-react'
import { checkFieldValue, type FormatIssue } from '@/core/masspost/format-check'
import { UNSTRUCTURED_MAX_LENGTH } from '@/core/masspost/mapping'
import { ADDRESS_FIELDS, FIELD_LABELS, formatCount } from './columns'
import { IssueRow, type RowActions } from './IssueRow'
import styles from './poc.module.css'

type GroupId = 'charset' | 'slash' | 'tooLong' | 'input'

const GROUPS: readonly { id: GroupId; title: string }[] = [
  { id: 'charset', title: 'Vreemde tekens' },
  { id: 'slash', title: 'Schuine streep in het adres' },
  { id: 'tooLong', title: `Te lang, meer dan ${UNSTRUCTURED_MAX_LENGTH} tekens` },
  { id: 'input', title: 'Jouw input nodig' },
]

/** Rows always visible per group; the rest opens under "Toon de N andere rijen", per page. */
const VISIBLE = 3
const PAGE = 100

const keyOf = (issue: FormatIssue) => `${issue.seq}:${issue.field}`

// —— Corrections: values per field, excluded rows, and an undo stack ——

interface Snapshot {
  key: string
  seq: number
  value: string | undefined
  excluded: boolean
}

interface Change {
  key: string
  seq: number
  /** `undefined` restores the original value. Leave the property out to keep the value. */
  value?: string | undefined
  excluded?: boolean
}

interface Corrections {
  values: Record<string, string>
  excluded: Record<number, true>
  undo: { id: number; items: Snapshot[] }[]
  nextId: number
}

type Action =
  | { type: 'apply'; changes: Change[] }
  | { type: 'toggleExclude'; key: string; seq: number }
  | { type: 'undo'; id?: number }

function write(values: Record<string, string>, excluded: Record<number, true>, change: Change | Snapshot) {
  if ('value' in change) {
    if (change.value === undefined) delete values[change.key]
    else values[change.key] = change.value
  }
  if (change.excluded !== undefined) {
    if (change.excluded) excluded[change.seq] = true
    else delete excluded[change.seq]
  }
}

function reducer(state: Corrections, action: Action): Corrections {
  if (action.type === 'toggleExclude') {
    const { key, seq } = action
    return reducer(state, { type: 'apply', changes: [{ key, seq, excluded: !state.excluded[seq] }] })
  }
  const values = { ...state.values }
  const excluded = { ...state.excluded }
  if (action.type === 'apply') {
    if (action.changes.length === 0) return state
    const items = action.changes.map((c) => ({
      key: c.key,
      seq: c.seq,
      value: state.values[c.key],
      excluded: !!state.excluded[c.seq],
    }))
    action.changes.forEach((change) => write(values, excluded, change))
    return { values, excluded, undo: [...state.undo, { id: state.nextId, items }], nextId: state.nextId + 1 }
  }
  const entry = action.id === undefined ? state.undo.at(-1) : state.undo.find((e) => e.id === action.id)
  if (!entry) return state
  ;[...entry.items].reverse().forEach((snapshot) => write(values, excluded, snapshot))
  return { ...state, values, excluded, undo: state.undo.filter((e) => e !== entry) }
}

interface Props {
  issues: FormatIssue[]
  rowCount: number
  /** Reports the open format errors and the excluded rows, for the pills in the top bar. */
  onTotals: (totals: { open: number; excludedRows: number }) => void
  /** Step 4 (address check) is shown instead of the list. Controlled by the flow, so the step bar follows. */
  done: boolean
  onDone: (done: boolean) => void
  /** Downloads the export for the printer; receives the row numbers left out of the mailing. */
  onExport: (excludedRowNumbers: number[]) => Promise<void>
  docsUrl?: string
  onRendered: () => void
}

/** Step 3: format problems grouped by kind, per row confirm or correct, or accept a whole group (sketch v8). */
export function FormatStep({
  issues,
  rowCount,
  onTotals,
  done,
  onDone,
  onExport,
  docsUrl,
  onRendered,
}: Props) {
  const [state, dispatch] = useReducer(reducer, { values: {}, excluded: {}, undo: [], nextId: 1 })
  const [stops, setStops] = useState<Partial<Record<GroupId, string>>>({})
  const [openGroups, setOpenGroups] = useState<Partial<Record<GroupId, boolean>>>({})
  const [pages, setPages] = useState<Partial<Record<GroupId, number>>>({})
  const [toast, setToast] = useState<{ id: number; count: number } | null>(null)
  const [exporting, setExporting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Measure the first paint only; the step remounts for every new check.
  const onRenderedRef = useRef(onRendered)
  useEffect(() => {
    requestAnimationFrame(() => onRenderedRef.current())
  }, [])

  const groups = useMemo(() => {
    const byId = new Map<GroupId, FormatIssue[]>(GROUPS.map((g) => [g.id, []]))
    for (const issue of issues) {
      const id: GroupId = issue.proposal && issue.kind !== 'empty' ? issue.kind : 'input'
      byId.get(id)!.push(issue)
    }
    return GROUPS.map((g) => ({ ...g, issues: byId.get(g.id)! })).filter((g) => g.issues.length > 0)
  }, [issues])

  const status = useCallback(
    (issue: FormatIssue) => {
      const value = state.values[keyOf(issue)] ?? issue.original
      const excluded = !!state.excluded[issue.seq]
      const ok = excluded || checkFieldValue(value, issue.field).ok
      return { value, excluded, open: !ok, showsProp: !ok && !!issue.proposal && value === issue.original }
    },
    [state.values, state.excluded],
  )

  const totals = useMemo(() => {
    let open = 0
    let excludedIssues = 0
    for (const issue of issues) {
      const s = status(issue)
      if (s.excluded) excludedIssues++
      else if (s.open) open++
    }
    return { open, ok: issues.length - open - excludedIssues, excludedRows: Object.keys(state.excluded).length }
  }, [issues, status, state.excluded])

  const contextOf = useCallback(
    (issue: FormatIssue) => {
      const parts = ADDRESS_FIELDS.filter((f) => f !== issue.field && issue.fields[f] !== undefined).map(
        (f) => `${FIELD_LABELS[f].title}: ${state.values[`${issue.seq}:${f}`] ?? issue.fields[f] ?? ''}`,
      )
      for (const [column, value] of Object.entries(issue.context)) parts.push(`${column}: ${value}`)
      return parts.join(' · ')
    },
    [state.values],
  )

  // —— Focus and keyboard ——

  const navItems = useCallback(() => {
    const root = containerRef.current
    if (!root) return []
    return [...root.querySelectorAll<HTMLElement>('[data-nav]')].filter((el) => el.offsetParent !== null)
  }, [])

  const focusItem = useCallback((el: HTMLElement | undefined) => {
    if (!el) return
    if (el.dataset.key) {
      const group = el.closest<HTMLElement>('[data-group]')?.dataset.group as GroupId | undefined
      if (group) setStops((s) => ({ ...s, [group]: el.dataset.key }))
    }
    el.focus()
  }, [])

  const actions = useMemo<RowActions>(
    () => ({
      commit: (issue, value) =>
        dispatch({
          type: 'apply',
          changes: [{ key: keyOf(issue), seq: issue.seq, value: value === issue.original ? undefined : value }],
        }),
      toggleExclude: (issue) => dispatch({ type: 'toggleExclude', key: keyOf(issue), seq: issue.seq }),
      focusRow: (issue) => {
        const el = containerRef.current?.querySelector<HTMLElement>(`[data-key="${keyOf(issue)}"]`)
        if (el && document.activeElement !== el && !el.contains(document.activeElement)) el.focus()
        const group = el?.closest<HTMLElement>('[data-group]')?.dataset.group as GroupId | undefined
        if (group) setStops((s) => (s[group] === keyOf(issue) ? s : { ...s, [group]: keyOf(issue) }))
      },
      move: (from, delta) => {
        const items = navItems()
        if (delta === 'first') return focusItem(items[0])
        if (delta === 'last') return focusItem(items.at(-1))
        const i = items.indexOf(from)
        focusItem(items[Math.max(0, Math.min(items.length - 1, i + delta))])
      },
      collapse: (from) => {
        const details = from.closest('details')
        if (!details?.open) return false
        details.open = false
        details.querySelector<HTMLElement>('summary')?.focus()
        return true
      },
    }),
    [navItems, focusItem],
  )

  function acceptGroup(groupIssues: FormatIssue[]) {
    const changes = groupIssues
      .filter((issue) => status(issue).showsProp)
      .map((issue) => ({ key: keyOf(issue), seq: issue.seq, value: issue.proposal }))
    if (changes.length === 0) return
    setToast({ id: state.nextId, count: changes.length })
    dispatch({ type: 'apply', changes })
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        const last = state.undo.at(-1)
        if (last && toast?.id === last.id) setToast(null)
        dispatch({ type: 'undo' })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.undo, toast])

  function onSummaryKeyDown(e: KeyboardEvent<HTMLElement>, group: GroupId) {
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
      setOpenGroups((s) => ({ ...s, [group]: true }))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setOpenGroups((s) => ({ ...s, [group]: false }))
    }
  }

  function onToggle(group: GroupId, open: boolean, firstKey: string, hiddenKeys: Set<string>) {
    setOpenGroups((s) => (s[group] === open ? s : { ...s, [group]: open }))
    // A closed group must not keep its Tab stop on a hidden row.
    if (!open) setStops((s) => (s[group] && hiddenKeys.has(s[group]!) ? { ...s, [group]: firstKey } : s))
  }

  const docsLink = docsUrl ? `${docsUrl}/documentatie/webapp/formaatvalidatie` : undefined
  const canContinue = totals.open === 0

  const summary =
    issues.length === 0
      ? `Geen formaatfouten gevonden in je ${formatCount(rowCount)} adressen.`
      : `${formatCount(totals.open)} formaatfouten open, ${formatCount(totals.ok)} in orde, ${formatCount(totals.excludedRows)} uitgesloten.`

  useEffect(() => {
    onTotals({ open: totals.open, excludedRows: totals.excludedRows })
  }, [onTotals, totals.open, totals.excludedRows])

  async function exportForPrinter() {
    setExporting(true)
    try {
      await onExport(Object.keys(state.excluded).map(Number))
    } finally {
      setExporting(false)
    }
  }

  if (done) {
    return (
      <section aria-labelledby="done-title">
        <h1 className={styles.t} id="done-title">
          Adrescontrole
        </h1>
        <div className={styles.panel}>
          <p>Je lijst voldoet aan de regels van bpost. De adrescontrole bij bpost zit nog niet in deze proefversie.</p>
          <p className={styles.m}>
            <strong>Voor de drukker:</strong> je bestand zoals je het opliet, met elke rij op haar plaats en twee kolommen
            erbij: <em>Meesturen</em> (ja, of nee voor een uitgesloten rij: niet drukken) en <em>Volgnummer bpost</em>.
          </p>
          <p>
            <button type="button" className={`${styles.b} ${styles.withIcon}`} onClick={exportForPrinter} disabled={exporting}>
              <IconDownload size={14} stroke={1.75} aria-hidden="true" />
              {exporting ? 'Bezig…' : 'Download voor de drukker (.xlsx)'}
            </button>
          </p>
        </div>
        {issues.length > 0 && (
          <div className={styles.actions}>
            <button type="button" className={styles.b} onClick={() => onDone(false)}>
              Terug naar de formaatfouten
            </button>
          </div>
        )}
      </section>
    )
  }

  return (
    <section aria-labelledby="format-title" ref={containerRef}>
      <div className={styles.hd}>
        <div>
          <h1 className={styles.t} id="format-title">
            Formaatvalidatie
          </h1>
          <p className={styles.m}>
            Voldoet je lijst aan de regels van bpost? We kijken de tekens, de lengte van elk veld, de verplichte velden
            en de gekoppelde kolommen na.
            {docsLink && (
              <>
                {' '}
                <a className={styles.link} href={docsLink} target="_blank" rel="noopener noreferrer">
                  Welke regels gebruiken we?
                </a>
              </>
            )}
          </p>
          <p className={styles.srOnly} aria-live="polite">
            {summary}
          </p>
        </div>
        <div className={styles.tg}>
          <button
            type="button"
            className={`${styles.b} ${styles.primary}`}
            disabled={!canContinue}
            onClick={() => onDone(true)}
          >
            Verder naar adrescontrole
          </button>
        </div>
      </div>

      {issues.length > 0 && (
        <>
          <p className={styles.help}>
            Klik op een rij, of Tab tot in de lijst. Kies een rij met ↑ ↓ en druk Enter om het voorstel over te nemen, of
            E om zelf aan te passen. Het vinkje wordt groen zodra de waarde aan de regels van bpost voldoet. Na een
            aanpassing verschijnt in het veld een knop om de oorspronkelijke waarde terug te zetten. Ga je terug naar
            Koppelen, dan vervallen je aanpassingen.
          </p>

          <div className={styles.cols} aria-hidden="true">
            <span>Rij · veld</span>
            <span>Huidige waarde</span>
            <span />
            <span>Voorstel</span>
            <span />
          </div>

          {groups.map((group) => {
            const openCount = group.issues.filter((issue) => status(issue).open).length
            const withProp = group.issues.filter((issue) => status(issue).showsProp).length
            const visible = group.issues.slice(0, VISIBLE)
            const hidden = group.issues.slice(VISIBLE)
            const firstKey = keyOf(group.issues[0])
            const stop = stops[group.id] ?? firstKey
            const isOpen = !!openGroups[group.id]
            const shownHidden = hidden.slice(0, (pages[group.id] ?? 1) * PAGE)
            const renderRow = (issue: FormatIssue) => {
              const s = status(issue)
              return (
                <IssueRow
                  key={keyOf(issue)}
                  issue={issue}
                  value={s.value}
                  excluded={s.excluded}
                  context={contextOf(issue)}
                  tabStop={stop === keyOf(issue)}
                  actions={actions}
                />
              )
            }
            return (
              <section key={group.id} data-group={group.id} aria-label={group.title}>
                <div className={styles.gh}>
                  <h2 className={styles.gn}>
                    {group.title}
                    <span>{openCount ? `${formatCount(openCount)} open` : 'alles in orde'}</span>
                  </h2>
                  {group.id !== 'input' && (
                    <button
                      type="button"
                      className={styles.b}
                      disabled={withProp === 0}
                      onClick={() => acceptGroup(group.issues)}
                    >
                      {withProp === 0
                        ? 'Alles in orde'
                        : withProp === 1
                          ? 'Overig voorstel overnemen'
                          : `Overige ${formatCount(withProp)} voorstellen overnemen`}
                    </button>
                  )}
                </div>
                {visible.map(renderRow)}
                {hidden.length > 0 && (
                  <details
                    open={isOpen}
                    onToggle={(e) =>
                      onToggle(group.id, e.currentTarget.open, firstKey, new Set(hidden.map(keyOf)))
                    }
                  >
                    <summary
                      data-nav=""
                      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                      onKeyDown={(e) => onSummaryKeyDown(e, group.id)}
                    >
                      <IconChevronRight className={styles.chev} size={14} aria-hidden="true" />
                      {isOpen ? 'Verberg' : 'Toon'} de {formatCount(hidden.length)} andere rijen
                    </summary>
                    {isOpen && shownHidden.map(renderRow)}
                    {isOpen && shownHidden.length < hidden.length && (
                      <div className={styles.more}>
                        <button
                          type="button"
                          className={styles.b}
                          onClick={() => setPages((p) => ({ ...p, [group.id]: (p[group.id] ?? 1) + 1 }))}
                        >
                          Toon nog {formatCount(Math.min(PAGE, hidden.length - shownHidden.length))} rijen
                        </button>
                      </div>
                    )}
                  </details>
                )}
              </section>
            )
          })}

          <p className={styles.kb}>
            <code>Tab</code> naar de volgende knop of groep rijen · <code>↑</code> <code>↓</code> rij kiezen ·{' '}
            <code>→</code> <code>←</code> rijen tonen of verbergen · <code>Enter</code> voorstel overnemen (zonder
            voorstel: aanpassen) · <code>E</code> aanpassen · tijdens het aanpassen: <code>Enter</code> bevestigen,{' '}
            <code>Esc</code> terugzetten · <code>X</code> uitsluiten of opnieuw opnemen · <code>⌘Z</code> laatste actie
            ongedaan maken
          </p>
        </>
      )}

      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span>
            {formatCount(toast.count)} {toast.count === 1 ? 'voorstel' : 'voorstellen'} overgenomen
          </span>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'undo', id: toast.id })
              setToast(null)
            }}
          >
            Ongedaan maken
          </button>
        </div>
      )}
    </section>
  )
}

'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from 'react'
import { IconChecks, IconChevronRight, IconDeviceFloppy, IconMailOff } from '@tabler/icons-react'
import { checkFieldValue, type FormatIssue } from '@/core/masspost/format-check'
import { UNSTRUCTURED_MAX_LENGTH } from '@/core/masspost/mapping'
import { ADDRESS_FIELDS, FIELD_LABELS, formatCount } from './columns'
import { IssueRow, type RowActions } from './IssueRow'
import { IconRows3 } from './StatusIcons'
import styles from './poc.module.css'

type GroupId = 'charset' | 'slash' | 'tooLong' | 'input'

const GROUPS: readonly { id: GroupId; title: string }[] = [
  { id: 'charset', title: 'Vreemde tekens' },
  { id: 'slash', title: 'Schuine streep in het adres' },
  { id: 'tooLong', title: `Te lang, meer dan ${UNSTRUCTURED_MAX_LENGTH} tekens` },
  { id: 'input', title: 'Jouw input nodig' },
]

/** Rows visible while a group is closed and still has open errors. The pill in the group header
 *  opens the rest, per page. */
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

/** Which file step 4 saves: for bpost's Address File Tool, or for the printer. */
export type SaveTarget = 'aft' | 'printer'

/** What the user decided in this step, for the files of step 4. */
export interface SaveChoices {
  excludedRowNumbers: number[]
  /** Corrected values by `"<row number>:<block>"`. */
  corrections: Record<string, string>
}

interface Props {
  issues: FormatIssue[]
  rowCount: number
  /** Reports the open format errors and the excluded rows, for the pills in the top bar. */
  onTotals: (totals: { open: number; excludedRows: number }) => void
  /** Step 4 (address check) is shown instead of the list. Controlled by the flow, so the step bar follows. */
  done: boolean
  onDone: (done: boolean) => void
  /** Saves a file of step 4, with the exclusions and corrections made here. */
  onSave: (target: SaveTarget, choices: SaveChoices) => Promise<void>
  docsUrl?: string
  onRendered: () => void
  /** False while another step is on screen: the step stays mounted so the corrections survive. */
  active: boolean
}

/** Step 3: format problems grouped by kind, per row confirm or correct, or accept a whole group (sketch v8). */
export function FormatStep({
  issues,
  rowCount,
  onTotals,
  done,
  onDone,
  onSave,
  docsUrl,
  onRendered,
  active,
}: Props) {
  const [state, dispatch] = useReducer(reducer, { values: {}, excluded: {}, undo: [], nextId: 1 })
  const [stops, setStops] = useState<Partial<Record<GroupId, string>>>({})
  // Open: every row. Closed: the first rows, or none once the group is in order and `shut`.
  const [expanded, setExpanded] = useState<Partial<Record<GroupId, boolean>>>({})
  const [shut, setShut] = useState<Partial<Record<GroupId, boolean>>>({})
  const [pages, setPages] = useState<Partial<Record<GroupId, number>>>({})
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [saving, setSaving] = useState<SaveTarget | null>(null)
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

  const groupStates = useMemo(
    () =>
      groups.map((group) => {
        let open = 0
        let withProp = 0
        // Two blocks of one row can both be open: "Alles uitsluiten" counts rows.
        const openRows = new Set<number>()
        for (const issue of group.issues) {
          const s = status(issue)
          if (s.open) {
            open++
            openRows.add(issue.seq)
          }
          if (s.showsProp) withProp++
        }
        return { ...group, open, withProp, openRows: openRows.size }
      }),
    [groups, status],
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

  /** Closes a group: back to its first rows, or to the header alone when nothing is left to do. */
  const closeGroup = useCallback((group: GroupId, resolved: boolean) => {
    setExpanded((s) => ({ ...s, [group]: false }))
    setShut((s) => ({ ...s, [group]: resolved }))
  }, [])

  // A group that becomes fully in order closes at once (before paint); undo opens it again.
  // Focus inside its rows moves to the pill in the header, which stays.
  const wasResolved = useRef<Partial<Record<GroupId, boolean>>>({})
  useLayoutEffect(() => {
    for (const group of groupStates) {
      const resolved = group.open === 0
      const was = wasResolved.current[group.id]
      wasResolved.current[group.id] = resolved
      if (was === undefined || was === resolved) continue
      if (!resolved) {
        setShut((s) => ({ ...s, [group.id]: false }))
        continue
      }
      const section = containerRef.current?.querySelector<HTMLElement>(`[data-group="${group.id}"]`)
      const active = document.activeElement
      const focusInRows = !!section && !!active && section.contains(active) && !active.closest('[data-head]')
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
        const section = from.closest<HTMLElement>('[data-group]')
        const toggle = section?.querySelector<HTMLElement>('[data-toggle]')
        if (!section || toggle?.getAttribute('aria-expanded') !== 'true') return false
        closeGroup(section.dataset.group as GroupId, toggle.dataset.resolved !== undefined)
        toggle.focus()
        return true
      },
    }),
    [navItems, focusItem, closeGroup],
  )

  function acceptGroup(groupIssues: FormatIssue[]) {
    const changes = groupIssues
      .filter((issue) => status(issue).showsProp)
      .map((issue) => ({ key: keyOf(issue), seq: issue.seq, value: issue.proposal }))
    if (changes.length === 0) return
    const n = changes.length
    setToast({ id: state.nextId, text: `${formatCount(n)} ${n === 1 ? 'voorstel' : 'voorstellen'} overgenomen` })
    dispatch({ type: 'apply', changes })
  }

  /** Excludes every row of the group that still has an open error (one change per row). */
  function excludeGroup(groupIssues: FormatIssue[]) {
    const rows = new Map<number, FormatIssue>()
    for (const issue of groupIssues) if (status(issue).open && !rows.has(issue.seq)) rows.set(issue.seq, issue)
    const changes = [...rows.values()].map((issue) => ({ key: keyOf(issue), seq: issue.seq, excluded: true }))
    if (changes.length === 0) return
    const n = changes.length
    setToast({ id: state.nextId, text: `${formatCount(n)} ${n === 1 ? 'rij' : 'rijen'} uitgesloten` })
    dispatch({ type: 'apply', changes })
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
        e.preventDefault()
        const last = state.undo.at(-1)
        if (last && toast?.id === last.id) setToast(null)
        dispatch({ type: 'undo' })
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [active, state.undo, toast])

  function onToggleKeyDown(e: KeyboardEvent<HTMLElement>, group: GroupId, resolved: boolean) {
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

  const docsLink = docsUrl ? `${docsUrl}/documentatie/webapp/formaatvalidatie` : undefined
  const canContinue = totals.open === 0

  const summary =
    issues.length === 0
      ? `Geen formaatfouten gevonden in je ${formatCount(rowCount)} adressen.`
      : `${formatCount(totals.open)} formaatfouten open, ${formatCount(totals.ok)} in orde, ${formatCount(totals.excludedRows)} uitgesloten.`

  useEffect(() => {
    onTotals({ open: totals.open, excludedRows: totals.excludedRows })
  }, [onTotals, totals.open, totals.excludedRows])

  async function save(target: SaveTarget) {
    setSaving(target)
    try {
      await onSave(target, { excludedRowNumbers: Object.keys(state.excluded).map(Number), corrections: state.values })
    } finally {
      setSaving(null)
    }
  }


  if (done) {
    return (
      <section aria-labelledby="done-title">
        <h1 className={styles.t} id="done-title">
          Adrescontrole
        </h1>
        <p className={styles.m}>
          Je lijst voldoet aan de regels van bpost. De adrescontrole bij bpost zit nog niet in deze proefversie.
        </p>
        <div className={styles.saveCards}>
          <section className={styles.saveCard} aria-labelledby="save-aft">
            <h2 className={styles.gn} id="save-aft">
              Voor bpost
            </h2>
            <p className={styles.m}>
              Een bestand voor de Address File Tool op het e-MassPost-portaal (Excel 97-2003, .xls). Enkel de adressen
              die meegaan, met je verbeteringen, als niet-prioritaire zending (NP).
            </p>
            <button
              type="button"
              className={`${styles.b} ${styles.withIcon}`}
              onClick={() => save('aft')}
              disabled={saving !== null}
            >
              <IconDeviceFloppy size={14} stroke={1.75} aria-hidden="true" />
              {saving === 'aft' ? 'Bezig…' : 'Opslaan voor bpost (AFT, .xls)'}
            </button>
          </section>
          <section className={styles.saveCard} aria-labelledby="save-printer">
            <h2 className={styles.gn} id="save-printer">
              Voor de drukker
            </h2>
            <p className={styles.m}>
              Je bestand zoals het was, met elke rij op haar plaats en twee kolommen erbij: <em>Meesturen</em> (ja, of
              nee voor een uitgesloten rij: niet drukken) en <em>Volgnummer bpost</em>.
            </p>
            <button
              type="button"
              className={`${styles.b} ${styles.withIcon}`}
              onClick={() => save('printer')}
              disabled={saving !== null}
            >
              <IconDeviceFloppy size={14} stroke={1.75} aria-hidden="true" />
              {saving === 'printer' ? 'Bezig…' : 'Opslaan voor de drukker (.xlsx)'}
            </button>
          </section>
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
            aanpassing verschijnt rechts in de rij, naast uitsluiten, een knop om de oorspronkelijke waarde terug te
            zetten. Je aanpassingen
            blijven bewaard tot je een ander bestand importeert of de koppeling wijzigt.
          </p>

          <div className={styles.cols} aria-hidden="true">
            <span>Rij · veld</span>
            <span>Huidige waarde</span>
            <span />
            <span>Voorstel</span>
            <span />
            <span />
          </div>

          {groupStates.map((group) => {
            const resolved = group.open === 0
            const isExpanded = !!expanded[group.id]
            const total = group.issues.length
            const rows = isExpanded
              ? group.issues.slice(0, VISIBLE + (pages[group.id] ?? 1) * PAGE)
              : resolved && shut[group.id]
                ? []
                : group.issues.slice(0, VISIBLE)
            const canToggle = isExpanded || rows.length < total
            // The Tab stop stays on a row that is on screen.
            const shownKeys = new Set(rows.map(keyOf))
            const saved = stops[group.id]
            const stop = saved && shownKeys.has(saved) ? saved : rows[0] && keyOf(rows[0])
            // Open rows on screen versus all open rows: "(3)/7" while some are folded away.
            const openShown = rows.filter((issue) => status(issue).open).length
            const partly = !resolved && openShown < group.open
            const label = resolved
              ? `${total === 1 ? 'De rij is' : `Alle ${formatCount(total)} rijen zijn`} in orde`
              : `${formatCount(group.open)} ${group.open === 1 ? 'rij' : 'rijen'} open${partly ? `, ${formatCount(openShown)} zichtbaar` : ''}`
            const toggleHint = isExpanded
              ? 'Klik om de rijen te verbergen.'
              : total === 1
                ? 'Klik om de rij te tonen.'
                : resolved
                  ? 'Klik om ze te tonen.'
                  : `Klik om alle ${formatCount(total)} rijen van deze groep te tonen.`
            const pillBody = (
              <span className={styles.pillBody} aria-hidden="true">
                <IconRows3 />
                {resolved ? (
                  formatCount(total)
                ) : partly ? (
                  `(${formatCount(openShown)})/${formatCount(group.open)}`
                ) : (
                  formatCount(group.open)
                )}
                {canToggle && <IconChevronRight className={styles.chev} size={12} stroke={2} />}
              </span>
            )
            // In order: a neutral pill with a green icon, like the other checks.
            const pillClass = `${styles.pill} ${resolved ? styles.pillOkSoft : styles.pillWarn}`
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
                        data-tip={`${label}. ${toggleHint}`}
                        aria-expanded={isExpanded}
                        aria-controls={`rows-${group.id}`}
                        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
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
                    {group.id === 'input' && group.open > 0 && (
                      <button
                        type="button"
                        className={`${styles.b} ${styles.withIcon}`}
                        data-tip={`Sluit ${group.openRows === 1 ? 'de rij' : `de ${formatCount(group.openRows)} rijen`} uit die nog open ${group.openRows === 1 ? 'staat' : 'staan'}. Ze blijven bewaard, maar gaan niet mee in de mailing.`}
                        onClick={() => excludeGroup(group.issues)}
                      >
                        <IconMailOff size={14} stroke={1.75} aria-hidden="true" />
                        Alles uitsluiten
                      </button>
                    )}
                    {group.id !== 'input' && group.withProp > 0 && (
                      <button
                        type="button"
                        className={`${styles.b} ${styles.withIcon}`}
                        data-tip={
                          group.withProp === 1
                            ? 'Neem het voorstel over dat nog open staat.'
                            : `Neem de ${formatCount(group.withProp)} voorstellen over die nog open staan.`
                        }
                        onClick={() => acceptGroup(group.issues)}
                      >
                        <IconChecks size={14} stroke={1.75} aria-hidden="true" />
                        Alles overnemen
                      </button>
                    )}
                  </div>
                </div>
                <div id={`rows-${group.id}`}>
                  {rows.map((issue) => {
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
                  })}
                  {isExpanded && rows.length < total && (
                    <div className={styles.more}>
                      <button
                        type="button"
                        className={styles.b}
                        onClick={() => setPages((p) => ({ ...p, [group.id]: (p[group.id] ?? 1) + 1 }))}
                      >
                        Toon nog {formatCount(Math.min(PAGE, total - rows.length))} rijen
                      </button>
                    </div>
                  )}
                </div>
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
          <span>{toast.text}</span>
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

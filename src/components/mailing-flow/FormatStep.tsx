'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent } from 'react'
import { IconChecks, IconChevronRight, IconMailOff } from '@tabler/icons-react'
import { checkFieldValue, type FormatIssue } from '@/core/masspost/format-check'
import { UNSTRUCTURED_MAX_LENGTH } from '@/core/masspost/mapping'
import { ADDRESS_FIELDS, FIELD_LABELS, formatCount } from './columns'
import type { CorrectionAction, Corrections } from './corrections'
import { IssueRow, type RowActions } from './IssueRow'
import { IconRows3 } from './StatusIcons'
import styles from './mailing-flow.module.css'
import { NextButton } from './NextButton'
import { StepAction } from './StepAction'

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

interface Props {
  issues: FormatIssue[]
  rowCount: number
  /** Reports the open format errors and the excluded rows, for the pills in the top bar. */
  onTotals: (totals: { open: number; excludedRows: number }) => void
  /** Goes on to step 4 (address check). Controlled by the flow, so the step bar follows. */
  onDone: (done: boolean) => void
  docsUrl?: string
  /** False while another step is on screen: the step stays mounted so the corrections survive. */
  active: boolean
  /** Corrections and exclusions, owned by MailingFlow and shared with step 4. */
  corrections: Corrections
  dispatch: Dispatch<CorrectionAction>
}

/** Step 3: format problems grouped by kind, per row confirm or correct, or accept a whole group (sketch v8). */
export function FormatStep({
  issues,
  rowCount,
  onTotals,
  onDone,
  docsUrl,
  active,
  corrections,
  dispatch,
}: Props) {
  const state = corrections
  const [stops, setStops] = useState<Partial<Record<GroupId, string>>>({})
  // Open: every row. Closed: the first rows, or none once the group is in order and `shut`.
  const [expanded, setExpanded] = useState<Partial<Record<GroupId, boolean>>>({})
  const [shut, setShut] = useState<Partial<Record<GroupId, boolean>>>({})
  const [pages, setPages] = useState<Partial<Record<GroupId, number>>>({})
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
          scope: 'format',
          changes: [{ key: keyOf(issue), seq: issue.seq, value: value === issue.original ? undefined : value }],
        }),
      toggleExclude: (issue) => dispatch({ type: 'toggleExclude', scope: 'format', key: keyOf(issue), seq: issue.seq }),
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
    dispatch({ type: 'apply', scope: 'format', changes })
  }

  /** Excludes every row of the group that still has an open error (one change per row). */
  function excludeGroup(groupIssues: FormatIssue[]) {
    const rows = new Map<number, FormatIssue>()
    for (const issue of groupIssues) if (status(issue).open && !rows.has(issue.seq)) rows.set(issue.seq, issue)
    const changes = [...rows.values()].map((issue) => ({ key: keyOf(issue), seq: issue.seq, excluded: true }))
    if (changes.length === 0) return
    const n = changes.length
    setToast({ id: state.nextId, text: `${formatCount(n)} ${n === 1 ? 'rij' : 'rijen'} uitgesloten` })
    dispatch({ type: 'apply', scope: 'format', changes })
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
        if (!last || last.scope !== 'format') return
        e.preventDefault()
        if (toast?.id === last.id) setToast(null)
        dispatch({ type: 'undo', scope: 'format' })
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

  // Only when the totals change: the parent may pass a new callback on every render.
  const onTotalsRef = useRef(onTotals)
  onTotalsRef.current = onTotals
  useEffect(() => {
    onTotalsRef.current({ open: totals.open, excludedRows: totals.excludedRows })
  }, [totals.open, totals.excludedRows])

  return (
    <section aria-label="Formaatvalidatie" ref={containerRef}>
      <div className={styles.hd}>
        <div>
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
        <StepAction step="format">
          <NextButton disabled={!canContinue} onClick={() => onDone(true)}>
            Verder naar adrescontrole
          </NextButton>
        </StepAction>
      </div>

      {issues.length > 0 && (
        <>
          <p className={styles.help}>
            Klik op een rij, of Tab tot in de lijst. Kies een rij met ↑ ↓ en druk Enter om het voorstel over te nemen, of
            E om zelf aan te passen. Het vinkje wordt groen zodra de waarde aan de regels van bpost voldoet. Na een
            aanpassing verschijnt rechts in de rij, naast uitsluiten, een knop om de oorspronkelijke waarde terug te
            zetten. Je aanpassingen blijven bewaard. Wijzig je de koppeling van een vak (bv. de straat), dan vervallen
            enkel de aanpassingen in dat vak.
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
              dispatch({ type: 'undo', id: toast.id, scope: 'format' })
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

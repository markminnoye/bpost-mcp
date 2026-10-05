'use client'

import { memo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { IconArrowBackUp, IconCircleCheck, IconCircleX, IconCornerDownLeft, IconMail, IconMailOff } from '@tabler/icons-react'
import { checkFieldValue, type FormatIssue } from '@/core/masspost/format-check'
import { FIELD_LABELS } from './columns'
import styles from './poc.module.css'

/** Stable callbacks from FormatStep, shared by every row. */
export interface RowActions {
  /** Store a value; the original value clears the correction. */
  commit: (issue: FormatIssue, value: string) => void
  toggleExclude: (issue: FormatIssue) => void
  focusRow: (issue: FormatIssue) => void
  /** Move focus over rows and "show more" toggles; `delta` is ±1, or the first/last item. */
  move: (from: HTMLElement, delta: number | 'first' | 'last') => void
  /** Collapse the hidden rows around `from` and focus their toggle. False when not inside one. */
  collapse: (from: HTMLElement) => boolean
}

interface Props {
  issue: FormatIssue
  /** Committed value (original or corrected). */
  value: string
  excluded: boolean
  /** Other blocks and context columns of this row, shown while the row has focus. */
  context: string
  tabStop: boolean
  actions: RowActions
}

const noBlur = (e: MouseEvent) => e.preventDefault()

/** One field with a format problem: editable value, live check, proposal, undo and exclude (sketch v8). */
export const IssueRow = memo(function IssueRow({ issue, value, excluded, context, tabStop, actions }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // A ref as well as state: Enter commits and moves focus, and the blur that follows must not commit twice.
  const editRef = useRef<{ before: string; draft: string } | null>(null)
  const [draft, setDraft] = useState<string | null>(null)

  const shown = draft ?? value
  const check = excluded ? null : checkFieldValue(shown, issue.field)
  const error = check && !check.ok ? check.message : null
  const showsProp = !!error && !!issue.proposal && shown === issue.original
  const changed = !excluded && shown !== issue.original
  const label = `Rij ${issue.rowNumber} · ${FIELD_LABELS[issue.field].short}`
  const id = `f-${issue.seq}-${issue.field}`

  function startEdit() {
    if (excluded) return
    inputRef.current?.focus()
    const end = inputRef.current?.value.length ?? 0
    inputRef.current?.setSelectionRange(end, end)
  }

  function stopEdit(keep: boolean) {
    const edit = editRef.current
    if (!edit) return
    editRef.current = null
    setDraft(null)
    if (keep && edit.draft !== value) actions.commit(issue, edit.draft)
  }

  function accept() {
    if (!issue.proposal) return
    editRef.current = null
    setDraft(null)
    actions.commit(issue, issue.proposal)
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== rowRef.current) return
    const key = e.key.toLowerCase()
    const mod = e.metaKey || e.ctrlKey || e.altKey
    const row = rowRef.current
    if (e.key === 'ArrowDown' || (key === 'j' && !mod)) {
      e.preventDefault()
      actions.move(row, 1)
    } else if (e.key === 'ArrowUp' || (key === 'k' && !mod)) {
      e.preventDefault()
      actions.move(row, -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      actions.move(row, 'first')
    } else if (e.key === 'End') {
      e.preventDefault()
      actions.move(row, 'last')
    } else if (e.key === 'ArrowLeft') {
      if (actions.collapse(row)) e.preventDefault()
    } else if (e.key === 'Enter' && showsProp) {
      e.preventDefault()
      accept()
      actions.move(row, 1)
    } else if (e.key === 'Enter' || e.key === 'F2' || (key === 'e' && !mod)) {
      e.preventDefault()
      startEdit()
    } else if (key === 'x' && !mod) {
      e.preventDefault()
      actions.toggleExclude(issue)
    }
  }

  function onRowMouseDown(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target === rowRef.current || target.dataset.rowArea !== undefined) {
      e.preventDefault()
      actions.focusRow(issue)
    }
  }

  const statusTip = error ?? (changed ? `In orde. Oorspronkelijk: ${issue.original || '(leeg)'}` : 'In orde.')
  const excludeTip = excluded
    ? 'Opnieuw opnemen in de mailing (X)'
    : 'Uitsluiten uit de mailing (X). De rij blijft bewaard.'
  const undoTip = `Oorspronkelijke waarde terugzetten: ${issue.original || '(leeg)'}`
  const rowSummary = excluded
    ? 'Uitgesloten.'
    : error
      ? `Fout: ${error}${showsProp ? ` Voorstel: ${issue.proposal}.` : ''}`
      : 'In orde.'

  return (
    <div
      ref={rowRef}
      className={`${styles.row} ${draft !== null ? styles.editing : ''} ${excluded ? styles.excl : ''}`}
      tabIndex={tabStop ? 0 : -1}
      data-nav=""
      data-key={`${issue.seq}:${issue.field}`}
      aria-label={`${label}: ${shown || '(leeg)'}. ${rowSummary}`}
      aria-keyshortcuts="ArrowUp ArrowDown Enter E X"
      onKeyDown={onRowKeyDown}
      onMouseDown={onRowMouseDown}
      onFocus={(e) => {
        if (e.target === rowRef.current) actions.focusRow(issue)
      }}
    >
      <div className={styles.k} data-row-area="">
        {label}
      </div>

      <div className={styles.cell}>
        <div className={styles.fw}>
          <input
            ref={inputRef}
            id={id}
            className={styles.in}
            tabIndex={-1}
            value={shown}
            disabled={excluded}
            placeholder={excluded ? '(leeg)' : ''}
            aria-label={label}
            aria-invalid={!!error}
            aria-describedby={`${id}-why`}
            onFocus={() => {
              if (!editRef.current) {
                editRef.current = { before: value, draft: value }
                setDraft(value)
              }
              actions.focusRow(issue)
            }}
            onChange={(e) => {
              if (editRef.current) editRef.current.draft = e.target.value
              setDraft(e.target.value)
            }}
            onBlur={() => stopEdit(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                stopEdit(true)
                rowRef.current?.focus()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                stopEdit(false)
                rowRef.current?.focus()
              }
            }}
          />
        </div>
        <div className={styles.why} id={`${id}-why`} data-row-area="">
          {error}
        </div>
      </div>

      <span className={`${styles.st} ${error ? styles.bad : excluded ? '' : styles.ok}`} data-tip={excluded ? undefined : statusTip}>
        {!excluded &&
          (error ? (
            <IconCircleX size={19} stroke={1.75} aria-hidden="true" />
          ) : (
            <IconCircleCheck size={19} stroke={1.75} aria-hidden="true" />
          ))}
      </span>

      <div className={styles.prop}>
        {excluded ? (
          <span className={styles.xtag}>Uitgesloten uit de mailing</span>
        ) : showsProp ? (
          <>
            <button
              type="button"
              className={styles.ib}
              tabIndex={-1}
              data-tip="Voorstel overnemen (Enter)"
              aria-label={`Voorstel overnemen: ${issue.proposal}`}
              onMouseDown={noBlur}
              onClick={() => {
                accept()
                rowRef.current?.focus()
              }}
            >
              <IconCornerDownLeft size={15} stroke={1.75} aria-hidden="true" />
            </button>
            <span>{issue.proposal}</span>
          </>
        ) : null}
      </div>

      {/* Commands on the right: put the original value back (after a change), then exclude. */}
      {changed ? (
        <button
          type="button"
          className={`${styles.ib} ${styles.xbtn}`}
          tabIndex={-1}
          data-tip={undoTip}
          aria-label={undoTip}
          onMouseDown={noBlur}
          onClick={() => {
            editRef.current = null
            setDraft(null)
            actions.commit(issue, issue.original)
            rowRef.current?.focus()
          }}
        >
          <IconArrowBackUp size={15} stroke={1.75} aria-hidden="true" />
        </button>
      ) : (
        <span />
      )}

      <button
        type="button"
        className={`${styles.ib} ${styles.xbtn}`}
        tabIndex={-1}
        aria-pressed={excluded}
        data-tip={excludeTip}
        aria-label={excludeTip}
        onMouseDown={noBlur}
        onClick={() => {
          stopEdit(true)
          actions.toggleExclude(issue)
          rowRef.current?.focus()
        }}
      >
        {/* The icon shows what a click does: a struck-out envelope excludes, a plain one takes the row back. */}
        {excluded ? (
          <IconMail size={15} stroke={1.75} aria-hidden="true" />
        ) : (
          <IconMailOff size={15} stroke={1.75} aria-hidden="true" />
        )}
      </button>

      <div className={styles.ctx} data-row-area="">
        {context}
      </div>
    </div>
  )
})

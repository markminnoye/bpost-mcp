'use client'

import { memo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import {
  IconAlertCircle,
  IconArrowBackUp,
  IconChevronDown,
  IconCircleCheck,
  IconCircleX,
  IconCornerDownLeft,
  IconInfoCircle,
  IconMail,
  IconMailOff,
} from '@tabler/icons-react'
import { splitAddress, type CheckRow } from '@/core/masspost/address-check'
import { FIELD_LABELS } from './columns'
import styles from './mailing-flow.module.css'

const ADDRESS_HELP = 'Schrijf het adres als: straat en nummer, postcode en gemeente.'
const WHY = {
  noAddress: 'e-MassPost vond dit adres niet.',
  multiple: 'e-MassPost vond meerdere adressen die passen. Kies het juiste.',
  proposal: 'e-MassPost stelt een andere schrijfwijze voor.',
} as const
const noBlur = (e: MouseEvent) => e.preventDefault()

/** Stable callbacks from CheckGroups, shared by every row. */
export interface AddressRowActions {
  /** Store a value; the original value clears the correction. */
  commit: (row: CheckRow, value: string) => void
  toggleExclude: (row: CheckRow) => void
  focusRow: (row: CheckRow) => void
  /** Move focus over rows and group toggles; `delta` is ±1, or the first/last item. */
  move: (from: HTMLElement, delta: number | 'first' | 'last') => void
}

/** Props of one row of step 4. */
export interface AddressRowProps {
  row: CheckRow
  /** The value now (`currentValue`). */
  value: string
  excluded: boolean
  /** Still asks for something (`isOpen`). */
  open: boolean
  /** The other fields of the address, shown while the row has focus. */
  context: string
  tabStop: boolean
  actions: AddressRowActions
}

/**
 * One address in step 4, in the style of a row of the format step (`IssueRow`): the value, a list of
 * the addresses e-MassPost proposes with their source, take a proposal over, change it yourself, put it
 * back or exclude the row (sketch adrescontrole.html v4.6).
 * @param props The row, its value now, whether it is excluded or open, the context and the actions.
 */
export const AddressRow = memo(function AddressRow({ row, value, excluded, open, context, tabStop, actions }: AddressRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // A ref as well as state: Enter commits and moves focus, and the blur that follows must not commit twice.
  const editRef = useRef<string | null>(null)
  const [draft, setDraft] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const shown = draft ?? value
  const changed = !excluded && value !== row.original
  const showsProp = !excluded && !!row.proposal && value === row.original
  const isAddress = row.field === 'address'
  const label = `Rij ${row.seq} · ${row.field === 'address' ? 'adres' : FIELD_LABELS[row.field].short}`
  const id = `a-${row.key.replace(':', '-')}`
  // Filter only on what the user typed; on focus the field holds the current value and every option shows.
  const query = draft !== null && draft !== value ? draft.toLowerCase() : ''
  const options = query ? row.options.filter((o) => o.value.toLowerCase().includes(query)) : row.options

  /** Ends editing. A value that is not an address keeps the field open with the explanation. */
  function commit(next: string): boolean {
    if (isAddress && next !== row.original && !splitAddress(next)) {
      setError(ADDRESS_HELP)
      return false
    }
    editRef.current = null
    setError(null)
    setDraft(null)
    setListOpen(false)
    if (next !== value) actions.commit(row, next)
    return true
  }

  function cancel() {
    editRef.current = null
    setDraft(null)
    setListOpen(false)
    setError(null)
  }

  function startEdit() {
    if (excluded) return
    inputRef.current?.focus()
    const end = inputRef.current?.value.length ?? 0
    inputRef.current?.setSelectionRange(end, end)
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== rowRef.current) return
    const key = e.key.toLowerCase()
    const mod = e.metaKey || e.ctrlKey || e.altKey
    const el = rowRef.current
    if (e.key === 'ArrowDown' || (key === 'j' && !mod)) {
      e.preventDefault()
      actions.move(el, 1)
    } else if (e.key === 'ArrowUp' || (key === 'k' && !mod)) {
      e.preventDefault()
      actions.move(el, -1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      actions.move(el, 'first')
    } else if (e.key === 'End') {
      e.preventDefault()
      actions.move(el, 'last')
    } else if (e.key === 'Enter' && showsProp) {
      e.preventDefault()
      commit(row.proposal!)
      actions.move(el, 1)
    } else if (e.key === 'Enter' || e.key === 'F2' || (key === 'e' && !mod)) {
      e.preventDefault()
      startEdit()
    } else if (key === 'x' && !mod) {
      e.preventDefault()
      actions.toggleExclude(row)
    }
  }

  function onRowMouseDown(e: MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target === rowRef.current || target.dataset.rowArea !== undefined) {
      e.preventDefault()
      actions.focusRow(row)
    }
  }

  // Status, explanation and what the proposal column shows.
  const fixed = changed && !error
  const status = excluded
    ? null
    : error || (open && !showsProp)
      ? 'bad'
      : showsProp
        ? 'warn'
        : fixed
          ? 'ok'
          : row.group === 'note'
            ? 'info'
            : 'ok'
  const why = excluded
    ? null
    : error ??
      (fixed
        ? row.proposal && value === row.proposal
          ? 'Voorstel van e-MassPost overgenomen.'
          : 'Aangepast, nog niet door e-MassPost gecontroleerd.'
        : row.group === 'note'
          ? (row.note ?? null)
          : row.group === 'noAddress' || row.group === 'multiple' || row.group === 'proposal'
            ? WHY[row.group]
            : null)
  const whyClass = status === 'bad' ? '' : status === 'warn' ? styles.whyWarn : styles.whyInfo
  const excludeTip = excluded ? 'Opnieuw opnemen in de mailing (X)' : 'Uitsluiten uit de mailing (X). De rij blijft bewaard.'
  const undoTip = `Oorspronkelijke waarde terugzetten: ${row.original || '(leeg)'}`

  return (
    <div
      ref={rowRef}
      role="group"
      className={`${styles.row} ${draft !== null ? styles.editing : ''} ${excluded ? styles.excl : ''}`}
      tabIndex={tabStop ? 0 : -1}
      data-nav=""
      data-key={row.key}
      aria-label={`${label}: ${shown || '(leeg)'}${why ? `. ${why}` : ''}`}
      aria-keyshortcuts="ArrowUp ArrowDown Enter E X"
      onKeyDown={onRowKeyDown}
      onMouseDown={onRowMouseDown}
      onFocus={(e) => {
        if (e.target === rowRef.current) actions.focusRow(row)
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
            role={isAddress ? 'combobox' : undefined}
            aria-label={label}
            aria-expanded={isAddress ? listOpen && options.length > 0 : undefined}
            aria-controls={isAddress ? `${id}-list` : undefined}
            aria-activedescendant={isAddress && listOpen && highlight >= 0 ? `${id}-opt-${highlight}` : undefined}
            aria-autocomplete={isAddress ? 'list' : undefined}
            aria-invalid={status === 'bad'}
            aria-describedby={`${id}-why`}
            value={shown}
            disabled={excluded}
            onFocus={() => {
              if (editRef.current === null) {
                editRef.current = value
                setDraft(value)
              }
              setListOpen(true)
              setHighlight(-1)
              actions.focusRow(row)
            }}
            onChange={(e) => {
              editRef.current = e.target.value
              setDraft(e.target.value)
              setListOpen(true)
              setHighlight(-1)
              setError(null)
            }}
            onBlur={() => {
              if (editRef.current !== null && !commit(editRef.current)) return
              setListOpen(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && listOpen && options.length) {
                e.preventDefault()
                setHighlight((h) => Math.min(options.length - 1, h + 1))
              } else if (e.key === 'ArrowUp' && listOpen && options.length) {
                e.preventDefault()
                setHighlight((h) => Math.max(0, h - 1))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                const next = highlight >= 0 && options[highlight] ? options[highlight].value : (editRef.current ?? shown)
                if (commit(next)) rowRef.current?.focus()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                if (listOpen && options.length) setListOpen(false)
                else {
                  cancel()
                  rowRef.current?.focus()
                }
              }
            }}
          />
          {isAddress && row.options.length > 0 && (
            <IconChevronDown className={styles.chevIn} size={15} stroke={1.75} aria-hidden="true" />
          )}
          {isAddress && listOpen && options.length > 0 && (
            <ul className={styles.sug} role="listbox" id={`${id}-list`}>
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === highlight}
                  className={i === highlight ? styles.hl : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    if (commit(o.value)) rowRef.current?.focus()
                  }}
                >
                  <span>{o.value}</span>
                  <small>{o.source}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={`${styles.why} ${whyClass}`} id={`${id}-why`} data-row-area="">
          {why}
        </div>
      </div>

      <span className={`${styles.st} ${status === 'bad' ? styles.bad : status === 'warn' ? styles.stWarn : status === 'info' ? styles.stInfo : status === 'ok' ? styles.ok : ''}`}>
        {status === 'bad' && <IconCircleX size={19} stroke={1.75} aria-hidden="true" />}
        {status === 'warn' && <IconAlertCircle size={19} stroke={1.75} aria-hidden="true" />}
        {status === 'info' && <IconInfoCircle size={19} stroke={1.75} aria-hidden="true" />}
        {status === 'ok' && <IconCircleCheck size={19} stroke={1.75} aria-hidden="true" />}
      </span>

      <div className={styles.prop}>
        {excluded ? (
          <span className={styles.xtag}>Uitgesloten uit de mailing</span>
        ) : showsProp ? (
          <>
            <span>{row.proposal}</span>
            <small className={styles.src}>OptiAddress</small>
          </>
        ) : isAddress && open ? (
          <span>
            {row.options.length > 0
              ? `Kies uit ${row.options.length} ${row.options.length === 1 ? 'adres' : 'adressen'}`
              : 'Pas het adres aan'}
          </span>
        ) : null}
      </div>

      {/* Take the proposal over, or put the original value back after a change (never both). Then exclude. */}
      {showsProp ? (
        <button
          type="button"
          className={`${styles.ib} ${styles.xbtn}`}
          tabIndex={-1}
          data-tip="Voorstel overnemen (Enter)"
          aria-label={`Voorstel overnemen: ${row.proposal}`}
          onMouseDown={noBlur}
          onClick={() => {
            commit(row.proposal!)
            rowRef.current?.focus()
          }}
        >
          <IconCornerDownLeft size={15} stroke={1.75} aria-hidden="true" />
        </button>
      ) : changed ? (
        <button
          type="button"
          className={`${styles.ib} ${styles.xbtn}`}
          tabIndex={-1}
          data-tip={undoTip}
          aria-label={undoTip}
          onMouseDown={noBlur}
          onClick={() => {
            cancel()
            actions.commit(row, row.original)
            rowRef.current?.focus()
          }}
        >
          <IconArrowBackUp size={15} stroke={1.75} aria-hidden="true" />
        </button>
      ) : (
        <span className={styles.xbtn} />
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
          cancel()
          actions.toggleExclude(row)
          rowRef.current?.focus()
        }}
      >
        {excluded ? <IconMail size={15} stroke={1.75} aria-hidden="true" /> : <IconMailOff size={15} stroke={1.75} aria-hidden="true" />}
      </button>

      <div className={styles.ctx} data-row-area="">
        {context}
      </div>
    </div>
  )
})

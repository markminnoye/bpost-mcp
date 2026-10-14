'use client'

import { useCallback, useEffect, useReducer, useRef, type Dispatch } from 'react'

// —— Corrections: values per field, excluded rows, and an undo stack (steps 3 and 4) ——

/** What a field and its row were before an action, to undo it. */
export interface CorrectionSnapshot {
  key: string
  seq: number
  value: string | undefined
  excluded: boolean
}

/** One change of a field or a row, keyed `<seq>:<field>`. */
export interface CorrectionChange {
  key: string
  seq: number
  /** `undefined` restores the original value. Leave the property out to keep the value. */
  value?: string | undefined
  excluded?: boolean
}

/** Which step made the change. Undo stays inside that step. */
export type CorrectionScope = 'format' | 'check'

/** Corrected values by `<seq>:<field>`, excluded rows by `seq`, and the undo stack. */
export interface Corrections {
  values: Record<string, string>
  excluded: Record<number, true>
  undo: { id: number; scope?: CorrectionScope; items: CorrectionSnapshot[] }[]
  nextId: number
}

/** What the user did: change fields, (re)include a row, undo, or start over (a new format check). */
export type CorrectionAction =
  | { type: 'apply'; changes: CorrectionChange[]; scope?: CorrectionScope }
  | { type: 'toggleExclude'; key: string; seq: number; scope?: CorrectionScope }
  | { type: 'undo'; id?: number; scope?: CorrectionScope }
  | { type: 'reset'; values: Record<string, string>; excluded: Record<number, true> }

function write(values: Record<string, string>, excluded: Record<number, true>, change: CorrectionChange | CorrectionSnapshot) {
  if ('value' in change) {
    if (change.value === undefined) delete values[change.key]
    else values[change.key] = change.value
  }
  if (change.excluded !== undefined) {
    if (change.excluded) excluded[change.seq] = true
    else delete excluded[change.seq]
  }
}

/**
 * The corrections and exclusions of steps 3 and 4, with an undo stack (one entry per action).
 * Undo with a `scope` only takes the latest entry of that step, so ⌘Z in step 4 leaves step 3.
 * `reset` starts over from given values (a new format check) and clears the undo stack.
 * @param state The current state.
 * @param action What happened.
 * @returns The new state.
 */
export function correctionsReducer(state: Corrections, action: CorrectionAction): Corrections {
  if (action.type === 'reset') return { values: { ...action.values }, excluded: { ...action.excluded }, undo: [], nextId: state.nextId }
  if (action.type === 'toggleExclude') {
    const { key, seq } = action
    return correctionsReducer(state, {
      type: 'apply',
      scope: action.scope,
      changes: [{ key, seq, excluded: !state.excluded[seq] }],
    })
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
    return { values, excluded, undo: [...state.undo, { id: state.nextId, scope: action.scope, items }], nextId: state.nextId + 1 }
  }
  const entry = action.id === undefined ? state.undo.at(-1) : state.undo.find((e) => e.id === action.id)
  if (!entry || (action.scope !== undefined && entry.scope !== action.scope)) return state
  ;[...entry.items].reverse().forEach((snapshot) => write(values, excluded, snapshot))
  return { ...state, values, excluded, undo: state.undo.filter((e) => e !== entry) }
}

/**
 * The corrections of a mailing, owned by `MailingFlow` and shared by the format step and step 4.
 * Reports every change by the user to save it; not the start and not a `reset`.
 * @param initial Values and exclusions to start from.
 * @param onChange Called after each change.
 * @returns The state and its dispatch.
 */
export function useCorrections(
  initial: { values: Record<string, string>; excluded: Record<number, true> },
  onChange: (s: { values: Record<string, string>; excluded: Record<number, true> }) => void,
): [Corrections, Dispatch<CorrectionAction>] {
  const [state, rawDispatch] = useReducer(correctionsReducer, undefined, () => ({
    values: initial.values,
    excluded: initial.excluded,
    undo: [],
    nextId: 1,
  }))
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })
  // Compared with the last reported state, not a "first run" flag: StrictMode runs the effect twice.
  const reported = useRef({ values: state.values, excluded: state.excluded })
  const resetting = useRef(false)
  useEffect(() => {
    if (reported.current.values === state.values && reported.current.excluded === state.excluded) return
    reported.current = { values: state.values, excluded: state.excluded }
    if (resetting.current) {
      resetting.current = false
      return
    }
    onChangeRef.current({ values: state.values, excluded: state.excluded })
  }, [state.values, state.excluded])
  const dispatch = useCallback((action: CorrectionAction) => {
    if (action.type === 'reset') resetting.current = true
    rawDispatch(action)
  }, [])
  return [state, dispatch]
}

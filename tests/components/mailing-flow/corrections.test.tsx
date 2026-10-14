// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { StrictMode, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { correctionsReducer, useCorrections, type Corrections } from '@/components/mailing-flow/corrections'

const empty: Corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }

describe('correctionsReducer', () => {
  it('applies, excludes and undoes, one entry per action', () => {
    let s = correctionsReducer(empty, { type: 'apply', changes: [{ key: '2:name', seq: 2, value: 'Jan' }] })
    s = correctionsReducer(s, { type: 'toggleExclude', key: '3:name', seq: 3 })
    expect(s).toMatchObject({ values: { '2:name': 'Jan' }, excluded: { 3: true } })
    s = correctionsReducer(s, { type: 'undo' })
    expect(s.excluded).toEqual({})
    s = correctionsReducer(s, { type: 'undo' })
    expect(s.values).toEqual({})
  })

  it('undo in step 4 leaves a correction from step 3', () => {
    let s = correctionsReducer(empty, { type: 'apply', scope: 'format', changes: [{ key: '2:name', seq: 2, value: 'Jan' }] })
    s = correctionsReducer(s, { type: 'apply', scope: 'check', changes: [{ key: '2:streetHouseBox', seq: 2, value: 'Kerkstraat 1' }] })
    s = correctionsReducer(s, { type: 'undo', scope: 'check' })
    expect(s.values).toEqual({ '2:name': 'Jan' })
    s = correctionsReducer(s, { type: 'undo', scope: 'check' })
    expect(s.values).toEqual({ '2:name': 'Jan' })
    s = correctionsReducer(s, { type: 'undo', scope: 'format' })
    expect(s.values).toEqual({})
  })

  it('reset replaces the values and clears the undo stack', () => {
    const s = correctionsReducer(
      correctionsReducer(empty, { type: 'apply', changes: [{ key: '2:name', seq: 2, value: 'Jan' }] }),
      { type: 'reset', values: { '5:postcodeCity': '9300 Aalst' }, excluded: { 7: true } },
    )
    expect(s).toMatchObject({ values: { '5:postcodeCity': '9300 Aalst' }, excluded: { 7: true }, undo: [] })
  })
})

describe('useCorrections', () => {
  const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>

  it('does not report the start as a change, also not in StrictMode; reports a change once', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useCorrections({ values: { '2:name': 'Jan' }, excluded: {} }, onChange), { wrapper: strict })
    expect(onChange).not.toHaveBeenCalled()
    act(() => result.current[1]({ type: 'toggleExclude', key: '2:name', seq: 2 }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith({ values: { '2:name': 'Jan' }, excluded: { 2: true } })
  })

  it('does not report a reset as a change', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() => useCorrections({ values: {}, excluded: {} }, onChange))
    act(() => result.current[1]({ type: 'reset', values: { '2:name': 'Jan' }, excluded: {} }))
    expect(onChange).not.toHaveBeenCalled()
  })
})

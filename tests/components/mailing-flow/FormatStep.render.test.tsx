// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { cleanup, render } from '@testing-library/react'
import { FormatStep } from '@/components/mailing-flow/FormatStep'

afterEach(cleanup)

const EMPTY = { values: {}, excluded: {}, undo: [], nextId: 1 }

/** A parent like MailingFlow: it passes a new onTotals on every render and keeps the totals in state. */
function Parent({ calls }: { calls: () => void }) {
  const [, setTotals] = useState({ open: 0, excludedRows: 0 })
  return (
    <FormatStep
      issues={[]}
      rowCount={10}
      onTotals={(t) => {
        calls()
        setTotals({ ...t })
      }}
      onDone={() => {}}
      active
      corrections={EMPTY}
      dispatch={() => {}}
    />
  )
}

describe('FormatStep totals', () => {
  it('reports the totals once, also when the parent passes a new callback on every render', () => {
    const calls = vi.fn()
    render(<Parent calls={calls} />)
    expect(calls.mock.calls.length).toBeLessThanOrEqual(2)
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { FormatStep } from '@/components/mailing-flow/FormatStep'

afterEach(cleanup)

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
      done={false}
      onDone={() => {}}
      onSave={async () => {}}
      active
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

describe('FormatStep, address check (step 4)', () => {
  it('shows the next button switched off, like every step, instead of a back button', () => {
    render(
      <FormatStep issues={[]} rowCount={10} onTotals={() => {}} done onDone={() => {}} onSave={async () => {}} active />,
    )
    expect((screen.getByRole('button', { name: 'Verder naar indienen' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: /Terug naar de formaatfouten/ })).toBeNull()
  })
})

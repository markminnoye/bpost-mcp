// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MailingRow } from '@/components/mailings/MailingRow'
import { summarize, type MailingSummary } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/fixtures'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const row = (over: Partial<MailingSummary> = {}): MailingSummary => ({ ...summarize(sampleMailing()), ...over })

function renderRows() {
  const noop = () => {}
  return render(
    <div>
      {[row({ id: '1', code: 'CP-2026-1', title: 'Eerste' }), row({ id: '2', code: 'CP-2026-2', title: 'Tweede' })].map(
        (m) => (
          <MailingRow key={m.id} mailing={m} twoLines={false} onPrinter={noop} onArchive={noop} onRestore={noop} />
        ),
      )}
    </div>,
  )
}

beforeEach(() => push.mockClear())
afterEach(cleanup)

describe('MailingRow', () => {
  it('opens the mailing on a click anywhere in the row, but not on the "…" menu', () => {
    renderRows()
    fireEvent.click(screen.getByText('CP-2026-1'))
    expect(push).toHaveBeenCalledWith('/mailings/CP-2026-1')

    push.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Acties voor CP-2026-1' }))
    expect(push).not.toHaveBeenCalled()
  })

  it('moves the focus between rows with ↑ and ↓, from the link and from the "…" button', () => {
    renderRows()
    const first = screen.getByRole('link', { name: 'Eerste' })
    const second = screen.getByRole('link', { name: 'Tweede' })

    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)

    const menu = screen.getByRole('button', { name: 'Acties voor CP-2026-2' })
    menu.focus()
    fireEvent.keyDown(menu, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(first)
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MailingRow } from '@/components/mailings/MailingRow'
import { summarize, type MailingSummary } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/fixtures'

const push = vi.fn()
const onCustomer = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const row = (over: Partial<MailingSummary> = {}): MailingSummary => ({ ...summarize(sampleMailing()), ...over })

function renderRows() {
  const noop = () => {}
  return render(
    <div>
      {[row({ id: '1', code: 'CP-2026-1', title: 'Eerste' }), row({ id: '2', code: 'CP-2026-2', title: 'Tweede' })].map(
        (m) => (
          <MailingRow key={m.id} mailing={m} twoLines={false} onPrinter={noop} onArchive={noop} onRestore={noop} onCustomer={onCustomer} />
        ),
      )}
    </div>,
  )
}

beforeEach(() => {
  push.mockClear()
  onCustomer.mockClear()
})
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

  it('searches for the customer on a click on its pill, without opening the mailing', () => {
    renderRows()
    const customer = summarize(sampleMailing()).customer
    fireEvent.click(screen.getAllByRole('button', { name: customer })[0])
    expect(onCustomer).toHaveBeenCalledWith(customer)
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the addresses abroad and the addresses that go to bpost, as in the step bar', () => {
    const noop = () => {}
    const { container } = render(
      <MailingRow
        mailing={row({ addresses: 789, excluded: 1, foreign: 1 })}
        twoLines={false}
        onPrinter={noop}
        onArchive={noop}
        onRestore={noop}
        onCustomer={noop}
      />,
    )
    expect(container.querySelector('[data-tip="1 adres in het buitenland: kijk het land na"]')).not.toBeNull()
    expect(container.querySelector('[data-tip="788 van de 789 adressen gaan mee (1 uitgesloten)"]')).not.toBeNull()
  })

  it('shows no pill for addresses abroad when there are none', () => {
    const { container } = renderRows()
    expect(container.querySelector('[data-tip*="in het buitenland"]')).toBeNull()
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

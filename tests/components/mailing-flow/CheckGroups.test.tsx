// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { groupCheckResult } from '@/core/masspost/address-check'
import type { MailingResult } from '@/core/masspost/parse-response'
import { CheckGroups } from '@/components/mailing-flow/CheckGroups'

afterEach(cleanup)

const sent = { name: 'Luc', streetHouseBox: 'Kerkstraat 1', postcodeCity: '9300 Aalst' }
const proposal = (seq: number, street: string, fix: string) => ({
  seq,
  messages: [{ code: '7001', severity: 'WARN', contents: { compCode: '92', compCorrection: fix } }],
  suggestions: [{ field: 'streetHouseBox' as const, value: fix, source: 'OptiAddress' as const }],
  candidates: [],
  sent: { ...sent, streetHouseBox: street },
})
const result: MailingResult = {
  kind: 'check',
  requestFileName: 'X_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  statusCode: '100',
  arr: 90,
  messages: [],
  items: [
    { seq: 58, messages: [{ code: 'MID-4010', severity: 'ERROR', contents: {} }], suggestions: [], candidates: [], sent },
    { seq: 412, messages: [{ code: 'MID-4020', severity: 'ERROR', contents: {} }], suggestions: [], candidates: [{ streetHouseBox: 'KERKSTRAAT 1', postcodeCity: '9310 MOORSEL' }], sent },
    proposal(2, 'Kerkstraat 1', 'KERKSTRAAT 1 BUS 2'),
    proposal(3, 'Kerkstraat 3 1', 'KERKSTRAAT 3 BUS 1'),
    proposal(4, 'Kerkstraat 5 2', 'KERKSTRAAT 5 BUS 2'),
    proposal(5, 'Kerkstraat 7 3', 'KERKSTRAAT 7 BUS 3'),
  ],
}
const view = groupCheckResult(result, 10)
const corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }
const pillOf = (title: string) => screen.getByRole('region', { name: title }).querySelector('[data-pill]')!

describe('CheckGroups (sketch v4.6, in the style of the format step)', () => {
  it('shows the groups in order, the open addresses per group, and "(shown)/open" while rows are folded', () => {
    render(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(titles).toEqual(['Geen adres gevonden', 'Meerdere adressen gevonden', 'Voorstel van e-MassPost', 'In orde'])
    expect(pillOf('Geen adres gevonden').textContent).toBe('1')
    expect(pillOf('Voorstel van e-MassPost').textContent).toBe('(3)/4')
    expect(pillOf('In orde').textContent).toBe('4')
  })

  it('takes a proposal over with Enter, and all proposals in one action', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    fireEvent.keyDown(screen.getByRole('group', { name: /Rij 2 · straat/ }), { key: 'Enter' })
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'apply',
      scope: 'check',
      changes: [{ key: '2:streetHouseBox', seq: 2, value: 'Kerkstraat 1 bus 2' }],
    })
    fireEvent.click(screen.getByRole('button', { name: /Alles overnemen/ }))
    expect(dispatch).toHaveBeenLastCalledWith({
      type: 'apply',
      scope: 'check',
      changes: [
        { key: '2:streetHouseBox', seq: 2, value: 'Kerkstraat 1 bus 2' },
        { key: '3:streetHouseBox', seq: 3, value: 'Kerkstraat 3 bus 1' },
        { key: '4:streetHouseBox', seq: 4, value: 'Kerkstraat 5 bus 2' },
        { key: '5:streetHouseBox', seq: 5, value: 'Kerkstraat 7 bus 3' },
      ],
    })
    expect(screen.getByRole('status').textContent).toContain('4 voorstellen overgenomen')
  })

  it('excludes a row with X, with the envelope icons of the format step', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    fireEvent.keyDown(screen.getByRole('group', { name: /Rij 58 · adres/ }), { key: 'x' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'toggleExclude', scope: 'check', key: '58:address', seq: 58 })
    expect(screen.getAllByRole('button', { name: /Uitsluiten uit de mailing \(X\)/ }).length).toBeGreaterThan(0)
  })

  it('offers the candidates of e-MassPost for multiple matches, with the source, and says so in plain text', () => {
    render(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    expect(screen.getByText('Kies uit 1 adres').tagName).toBe('SPAN')
    expect(screen.getByText('Pas het adres aan').tagName).toBe('SPAN')
    const input = screen.getByRole('combobox', { name: /Rij 412 · adres/ })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const option = screen.getByRole('option', { name: /Kerkstraat 1, 9310 Moorsel/ })
    expect(option.textContent).toContain('OptiAddress')
    expect(input.getAttribute('aria-activedescendant')).toBe(option.id)
  })

  it('refuses an address without postcode', () => {
    const dispatch = vi.fn()
    render(<CheckGroups view={view} corrections={corrections} dispatch={dispatch} active />)
    const input = screen.getByRole('combobox', { name: /Rij 58 · adres/ })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Kerkstraat 10' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByText('Schrijf het adres als: straat en nummer, postcode en gemeente.')).toBeTruthy()
  })

  it('does not undo a correction from the format step', () => {
    const dispatch = vi.fn()
    render(
      <CheckGroups
        view={view}
        corrections={{
          ...corrections,
          undo: [{ id: 1, scope: 'format', items: [{ key: '2:name', seq: 2, value: undefined, excluded: false }] }],
          nextId: 2,
        }}
        dispatch={dispatch}
        active
      />,
    )
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('closes a group once all its addresses are in order, and opens it again on undo', () => {
    const { rerender } = render(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    expect(screen.getByRole('region', { name: 'Meerdere adressen gevonden' }).querySelectorAll('[role=group]').length).toBe(1)
    const fixed = { ...corrections, values: { '412:postcodeCity': '9310 Moorsel' } }
    rerender(<CheckGroups view={view} corrections={fixed} dispatch={() => {}} active />)
    expect(screen.getByRole('region', { name: 'Meerdere adressen gevonden' }).querySelectorAll('[role=group]').length).toBe(0)
    rerender(<CheckGroups view={view} corrections={corrections} dispatch={() => {}} active />)
    expect(screen.getByRole('region', { name: 'Meerdere adressen gevonden' }).querySelectorAll('[role=group]').length).toBe(1)
  })
})

// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ArrBar } from '@/components/mailing-flow/ArrBar'

afterEach(cleanup)

describe('ArrBar (sketch v4.6)', () => {
  it('shows the ARR of e-MassPost and, when different, the estimate', () => {
    render(<ArrBar arr={93.4} estimate={95.1} />)
    expect(screen.getByText('93,4 %')).toBeTruthy()
    expect(screen.getByText('Verwacht na jouw aanpassingen: 95,1 % (schatting; enkel e-MassPost geeft de echte score).')).toBeTruthy()
    const meter = screen.getByRole('meter', { name: 'ARR van e-MassPost' })
    expect(meter.getAttribute('aria-valuenow')).toBe('93.4')
    expect(meter.getAttribute('aria-valuetext')).toBe('93,4 %. Verwacht na jouw aanpassingen: 95,1 %.')
  })

  it('says there are no changes when the estimate equals the ARR', () => {
    render(<ArrBar arr={99.8} estimate={99.8} />)
    expect(screen.getByText('Nog geen aanpassingen sinds de laatste controle.')).toBeTruthy()
    expect(screen.getByRole('meter').getAttribute('aria-valuetext')).toBe('99,8 %')
  })

  it('explains the marks at 96 and 98 %', () => {
    render(<ArrBar arr={97.2} estimate={null} />)
    expect(screen.getByText('96 %').closest('[data-tip]')?.getAttribute('data-tip')).toBe('Vanaf 96 % kan je indienen.')
    expect(screen.getByText('98 %').closest('[data-tip]')?.getAttribute('data-tip')).toBe(
      'Vanaf 98 % krijg je extra korting voor datakwaliteit.',
    )
  })

  it('ends the bar in a gold star from 98 %, for the ARR and for the estimate', () => {
    const { container } = render(<ArrBar arr={97.2} estimate={null} />)
    expect(container.querySelector('[data-star]')).toBeNull()
    cleanup()
    const high = render(<ArrBar arr={99.8} estimate={null} />)
    expect(high.container.querySelectorAll('[data-star]').length).toBe(1)
    cleanup()
    const both = render(<ArrBar arr={98.2} estimate={99.1} />)
    expect(both.container.querySelectorAll('[data-star]').length).toBe(2)
  })
})

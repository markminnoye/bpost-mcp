// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { StatusIcon } from '@/components/mailings/StatusIcon'
import { statusLabel } from '@/components/mailings/labels'
import { summarize, type MailingSummary } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/fixtures'

afterEach(cleanup)

const row = (over: Partial<MailingSummary>): MailingSummary => ({ ...summarize(sampleMailing()), ...over })
const colour = (m: MailingSummary) => render(<StatusIcon mailing={m} />).container.querySelector('circle')?.getAttribute('stroke')

describe('StatusIcon', () => {
  it('follows the design of 02/10: the format check stays yellow, also once it is in order', () => {
    expect(colour(row({ status: 'format', formatIssuesOpen: 3 }))).toBe('var(--yellow)')
    cleanup()
    expect(colour(row({ status: 'format', formatIssuesOpen: 0 }))).toBe('var(--yellow)')
  })

  it('shows a withdrawn mailing with a cross, not with the dotted line of "not saved yet"', () => {
    const svg = render(<StatusIcon mailing={row({ status: 'withdrawn' })} />).container.querySelector('svg')!
    expect(svg.querySelector('circle')?.getAttribute('stroke-dasharray')).toBeNull()
    expect(svg.querySelector('path')?.getAttribute('d')).toContain('M6.8 6.8')
  })

  it('never shows black: an uploaded mailing is the grey empty circle', () => {
    expect(colour(row({ status: 'uploaded' }))).toBe('var(--text-muted)')
  })

  it('shows the waiting wheel and "Wachten op e-MassPost" while a file is with e-MassPost', () => {
    const waiting = row({ status: 'format', formatIssuesOpen: 0, waiting: true })
    expect(statusLabel(waiting)).toBe('Wachten op e-MassPost')
    const { container } = render(<StatusIcon mailing={waiting} />)
    expect(container.querySelectorAll('line').length).toBe(12)
  })

  it('colours a checked mailing yellow under 96 %, green from 96 % (design 13/10, decision 20)', () => {
    expect(colour(row({ status: 'checked', arr: 95.9 }))).toBe('var(--yellow)')
    cleanup()
    expect(colour(row({ status: 'checked', arr: 97.2 }))).toBe('var(--green)')
    cleanup()
    expect(colour(row({ status: 'checked', arr: 99.8 }))).toBe('var(--green)')
  })
})

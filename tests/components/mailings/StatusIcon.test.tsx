// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { StatusIcon } from '@/components/mailings/StatusIcon'
import { summarize, type MailingSummary } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/fixtures'

afterEach(cleanup)

const row = (over: Partial<MailingSummary>): MailingSummary => ({ ...summarize(sampleMailing()), ...over })
const colour = (m: MailingSummary) => render(<StatusIcon mailing={m} />).container.querySelector('circle')?.getAttribute('stroke')

describe('StatusIcon', () => {
  it('shows the format check in yellow while errors are open, and in green once it is in order', () => {
    expect(colour(row({ status: 'format', formatIssuesOpen: 3 }))).toBe('var(--yellow)')
    cleanup()
    expect(colour(row({ status: 'format', formatIssuesOpen: 0 }))).toBe('var(--green)')
  })

  it('never shows black: an uploaded mailing is the grey empty circle', () => {
    expect(colour(row({ status: 'uploaded' }))).toBe('var(--text-muted)')
  })
})

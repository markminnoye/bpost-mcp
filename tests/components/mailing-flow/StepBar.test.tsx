// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StepBar } from '@/components/mailing-flow/StepBar'

afterEach(cleanup)

describe('StepBar', () => {
  it('shows a green check before the label of a finished step only (Mark, 14/10)', () => {
    render(
      <StepBar
        current="check"
        status={{ upload: 'done', mapping: 'done', format: 'action', check: 'done' }}
        progress={{ upload: 1, mapping: 1, format: 0.5, check: 1 }}
        finished={{ upload: true, mapping: true, format: false, check: false }}
        reachable={{ upload: true, mapping: true, format: true, check: true }}
        onGo={() => {}}
      />,
    )
    const checks = (label: RegExp) => screen.getByText(label).closest('li')!.querySelectorAll('[data-finished]').length
    expect(checks(/1\. Importeren/)).toBe(1)
    expect(checks(/2\. Koppelen/)).toBe(1)
    expect(checks(/3\. Formaatvalidatie/)).toBe(0)
    expect(checks(/4\. Adrescontrole/)).toBe(0)
    expect(screen.getByText(/1\. Importeren/).closest('li')!.textContent).toContain('afgerond')
  })
})

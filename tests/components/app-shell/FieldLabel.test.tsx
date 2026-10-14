// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FieldLabel } from '@/components/app-shell/FieldLabel'

afterEach(cleanup)

const tip = 'Naam van de klant voor wie deze mailing verstuurd wordt.'

describe('FieldLabel', () => {
  it('shows the explanation only after a click on the info icon', () => {
    render(<FieldLabel htmlFor="f-klant" label="Klant" tip={tip} />)
    const button = screen.getByRole('button', { name: 'Uitleg bij Klant' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByText(tip)).toBeNull()

    fireEvent.click(screen.getByText('Klant'))
    expect(screen.queryByText(tip)).toBeNull()

    fireEvent.pointerDown(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe(tip)

    fireEvent.pointerDown(button)
    fireEvent.click(button)
    expect(screen.queryByText(tip)).toBeNull()
  })

  it('closes the explanation with Escape or a click outside the label', () => {
    render(
      <div>
        <FieldLabel htmlFor="f-klant" label="Klant" tip={tip} />
        <button type="button">Bewaren</button>
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Uitleg bij Klant' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText(tip)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Uitleg bij Klant' }))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Bewaren' }))
    expect(screen.queryByText(tip)).toBeNull()
  })
})

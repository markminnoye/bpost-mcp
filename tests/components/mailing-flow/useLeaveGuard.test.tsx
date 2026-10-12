// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useLeaveGuard } from '@/components/mailing-flow/useLeaveGuard'

afterEach(cleanup)

function Page({ active, onLeave, back = false }: { active: boolean; onLeave: (to: string) => void; back?: boolean }) {
  useLeaveGuard(() => active, onLeave, { back })
  return (
    <>
      <a href="/archief">Archief</a>
      <a href="https://example.com/">Extern</a>
    </>
  )
}

describe('useLeaveGuard', () => {
  it('stops a click on an internal link while active, and says where the user wanted to go', () => {
    const onLeave = vi.fn()
    render(<Page active onLeave={onLeave} />)
    const click = fireEvent.click(screen.getByText('Archief'))
    expect(click).toBe(false) // default prevented
    expect(onLeave).toHaveBeenCalledWith('/archief')
  })

  it('lets links through when inactive, and never stops external links', () => {
    const onLeave = vi.fn()
    const { rerender } = render(<Page active={false} onLeave={onLeave} />)
    expect(fireEvent.click(screen.getByText('Archief'))).toBe(true)
    rerender(<Page active onLeave={onLeave} />)
    expect(fireEvent.click(screen.getByText('Extern'))).toBe(true)
    expect(onLeave).not.toHaveBeenCalled()
  })

  it('catches the back button when asked to', () => {
    const onLeave = vi.fn()
    render(<Page active onLeave={onLeave} back />)
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(onLeave).toHaveBeenCalledWith('back')
  })
})

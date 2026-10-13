'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { StepId } from './StepBar'

/** Where the button of the step on screen goes, and which step that is. Provided by `MailingFlow`. */
export const StepActionContext = createContext<{ slot: HTMLElement | null; step: StepId } | null>(null)

/**
 * The "Verder naar …" button of a step, shown right on the line of the step bar (Mark, 13/10). The
 * step keeps its own button logic; only the step on screen shows it (the format step stays mounted
 * while hidden). Without a step bar around it, the button stays where it is.
 * @param props The step the button belongs to, and the button.
 */
export function StepAction({ step, children }: { step: StepId; children: ReactNode }) {
  const ctx = useContext(StepActionContext)
  if (!ctx) return <>{children}</>
  if (ctx.step !== step || !ctx.slot) return null
  return createPortal(children, ctx.slot)
}

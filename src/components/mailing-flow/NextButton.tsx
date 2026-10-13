import type { ReactNode } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import { Spinner } from './StatusIcons'
import styles from './mailing-flow.module.css'

/**
 * "Verder naar …" at the top right of a step: the black main button with an arrow to the right. Every
 * step has one; it stays off until the step is done (Mark, 12/10 and 13/10). While its work runs
 * (`busy`), it stays in place, switched off, with the waiting wheel instead of the arrow.
 * @param props The label, whether it is off or busy, and what a click does.
 */
export function NextButton({
  children,
  disabled,
  busy = false,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  busy?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`${styles.b} ${styles.primary} ${styles.withIcon}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {children}
      {busy ? <Spinner size={14} /> : <IconArrowRight size={14} stroke={1.75} aria-hidden="true" />}
    </button>
  )
}

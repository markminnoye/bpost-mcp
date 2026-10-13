import type { ReactNode } from 'react'
import { IconArrowRight } from '@tabler/icons-react'
import styles from './mailing-flow.module.css'

/**
 * "Verder naar …" at the top right of a step: the black main button with an arrow to the right. Every
 * step has one; it stays off until the step is done (Mark, 12/10 and 13/10).
 * @param props The label, whether it is off, and what a click does.
 */
export function NextButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button type="button" className={`${styles.b} ${styles.primary} ${styles.withIcon}`} disabled={disabled} onClick={onClick}>
      {children}
      <IconArrowRight size={14} stroke={1.75} aria-hidden="true" />
    </button>
  )
}

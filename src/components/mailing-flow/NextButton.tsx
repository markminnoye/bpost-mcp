import type { ReactNode } from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { Spinner } from './StatusIcons'
import app from '@/components/app-shell/app.module.css'
import styles from './mailing-flow.module.css'

/**
 * "Verder naar …" at the top right of a step: the black main button with the chevron of the step bar
 * to the right. Every step has one; it stays off until the step is done (Mark, 12/10 and 13/10). While
 * its work runs (`busy`), it stays in place, switched off, with the waiting wheel left of the label
 * and no chevron (Mark, 13/10). In a narrow page header only the icon stays; the label is then a
 * tip, and still the name for screen readers.
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
      className={`${styles.b} ${styles.primary} ${styles.withIcon} ${styles.headBtn} ${app.tipWhenNarrow}`}
      // Off, a button gets no tip of its own: the one around it (step 4) already explains why.
      data-tip={disabled || busy || typeof children !== 'string' ? undefined : children}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={onClick}
    >
      {busy && <Spinner size={14} />}
      <span className={app.btnLabel}>{children}</span>
      {!busy && <IconChevronRight size={14} stroke={1.75} aria-hidden="true" />}
    </button>
  )
}

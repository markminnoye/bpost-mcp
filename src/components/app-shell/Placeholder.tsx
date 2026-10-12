import type { ReactNode } from 'react'
import styles from './app.module.css'

/**
 * Something that is not built yet: muted, labelled "binnenkort", focusable but not clickable
 * (SR-112 v1 decision 4).
 * @param props Content, the hover tip, an optional class for the layout, and a role (`menuitem` in a menu).
 */
export function Placeholder({
  children,
  tip = 'Dit onderdeel bouwen we nog',
  className = '',
  role,
}: {
  children: ReactNode
  tip?: string
  className?: string
  role?: 'menuitem'
}) {
  return (
    <span className={`${styles.placeholder} ${className}`} role={role} aria-disabled="true" tabIndex={0} data-tip={tip}>
      {children}
      <span className={styles.soon}>binnenkort</span>
    </span>
  )
}

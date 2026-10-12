import type { ReactNode } from 'react'
import styles from './app.module.css'

/**
 * Something that is not built yet: muted, labelled "binnenkort", focusable but not clickable
 * (SR-112 v1 decision 4).
 * @param props Content, the hover tip, and an optional class for the layout.
 */
export function Placeholder({
  children,
  tip = 'Dit onderdeel bouwen we nog',
  className = '',
}: {
  children: ReactNode
  tip?: string
  className?: string
}) {
  return (
    <span className={`${styles.placeholder} ${className}`} aria-disabled="true" tabIndex={0} data-tip={tip}>
      {children}
      <span className={styles.soon}>binnenkort</span>
    </span>
  )
}

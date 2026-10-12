'use client'

import { useEffect } from 'react'
import styles from '@/components/app-shell/app.module.css'

/** An unexpected error on a page behind the login: the shell stays, with one way forward. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={styles.page}>
      <div className={`${styles.box} ${styles.state}`} role="alert">
        <h2>Er liep iets mis</h2>
        <p>Deze pagina kon niet getoond worden. Probeer het opnieuw; lukt dat niet, herlaad dan de pagina.</p>
        <button type="button" className={styles.btn} onClick={reset}>
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}

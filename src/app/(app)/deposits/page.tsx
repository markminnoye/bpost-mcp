import type { Metadata } from 'next'
import { IconTruck } from '@tabler/icons-react'
import { PageHeader } from '@/components/app-shell/AppShell'
import styles from '@/components/app-shell/app.module.css'

export const metadata: Metadata = { title: 'Deposits · Mailings voor e-MassPost' }

/** Deposits: not built yet (SR-112 decision 12). */
export default function DepositsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Deposits" />
      <div className={`${styles.box} ${styles.state}`}>
        <IconTruck className={styles.stateIcon} size={32} stroke={1.5} aria-hidden="true" />
        <h2>Dit onderdeel bouwen we nog</h2>
        <p>Hier volg je straks je afgiftes bij bpost op.</p>
      </div>
    </div>
  )
}

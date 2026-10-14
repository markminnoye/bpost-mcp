import type { Metadata } from 'next'
import { IconCalendar } from '@tabler/icons-react'
import { PageHeader } from '@/components/app-shell/AppShell'
import styles from '@/components/app-shell/app.module.css'

export const metadata: Metadata = { title: 'Planning · Mailings voor e-MassPost' }

/** Planning: not built yet. */
export default function PlanningPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="Planning" />
      <div className={`${styles.box} ${styles.state}`}>
        <IconCalendar className={styles.stateIcon} size={32} stroke={1.5} aria-hidden="true" />
        <h2>Dit onderdeel bouwen we nog</h2>
        <p>Hier zie je straks je mailings op de kalender: welke afgiftedatum wanneer valt, en wat er nog openstaat.</p>
      </div>
    </div>
  )
}

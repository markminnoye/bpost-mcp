import Link from 'next/link'
import { IconBuilding, IconCalendar, IconMail } from '@tabler/icons-react'
import type { MailingSummary } from '@/core/masspost/store/mailing'
import { formatCount } from '@/components/mailing-flow/columns'
import { MIN_ADDRESSES } from '@/components/mailing-flow/FileDrop'
import { printerReady } from '@/components/mailing-flow/exports'
import { arrTone, formatPercent, longDate, shortDate } from './labels'
import { RowMenu } from './RowMenu'
import { StatusIcon } from './StatusIcon'
import styles from '@/components/app-shell/app.module.css'

const SMALL = { size: 14, stroke: 1.75, 'aria-hidden': true } as const
const ARR_COLOR = { red: 'var(--red)', orange: 'var(--orange)', green: 'var(--green)' } as const

/**
 * One mailing in the list: on one line, or on two lines in a narrow area (SR-112 decision 10).
 * @param props The row, the layout and the menu actions.
 */
export function MailingRow({
  mailing: m,
  twoLines,
  onPrinter,
  onArchive,
  onRestore,
}: {
  mailing: MailingSummary
  twoLines: boolean
  onPrinter: () => void
  onArchive: () => void
  onRestore: () => void
}) {
  const code = <span className={styles.code}>{m.code}</span>
  const title = (
    <Link className={styles.title} href={`/mailings/${encodeURIComponent(m.code)}`} title={m.title}>
      {m.title}
    </Link>
  )
  const few = m.addresses < MIN_ADDRESSES
  const customer = m.customer ? (
    <span className={styles.pill} title={`Klant: ${m.customer}`}>
      <IconBuilding {...SMALL} />
      <span>{m.customer}</span>
    </span>
  ) : (
    <span className={`${styles.pill} ${styles.empty}`} aria-hidden="true" />
  )
  const addresses = (
    <span
      className={`${styles.pill} ${few ? styles.pillWarn : ''}`}
      title={`${formatCount(m.addresses)} adressen${few ? ', minder dan 500 (het minimum voor een mailing)' : ''}`}
    >
      <IconMail {...SMALL} />
      <span>{formatCount(m.addresses)}</span>
    </span>
  )
  const arr =
    m.arr === null ? (
      <span className={`${styles.arr} ${styles.muted}`} title="Nog niet gecontroleerd door bpost">
        —<span className={styles.srOnly}>nog geen ARR</span>
      </span>
    ) : (
      <span className={styles.arr} title="ARR: deel van de adressen dat bpost herkent">
        <span className={styles.dot} style={{ background: ARR_COLOR[arrTone(m.arr)] }} aria-hidden="true" />
        {formatPercent(m.arr)}
      </span>
    )
  const date = m.expectedDeliveryDate ? (
    <span className={styles.date} title={`Geplande afgifte: ${longDate(m.expectedDeliveryDate)}`}>
      {shortDate(m.expectedDeliveryDate)}
    </span>
  ) : (
    <span className={`${styles.date} ${styles.muted}`} title="Nog geen afgiftedatum">
      —
    </span>
  )
  const menu = (
    <RowMenu
      code={m.code}
      archived={m.archived}
      printerReady={printerReady(m)}
      onPrinter={onPrinter}
      onArchive={onArchive}
      onRestore={onRestore}
    />
  )

  if (!twoLines) {
    return (
      <div className={styles.row}>
        <StatusIcon mailing={m} />
        {code}
        {title}
        {customer}
        {addresses}
        {arr}
        {date}
        {menu}
      </div>
    )
  }
  return (
    <div className={styles.row}>
      <StatusIcon mailing={m} />
      <div className={styles.line}>
        <div className={styles.line1}>
          {title}
          {code}
        </div>
        <div className={styles.line2}>
          {m.customer && customer}
          {addresses}
          {m.arr !== null && arr}
          {m.expectedDeliveryDate && (
            <span className={styles.meta} title={`Geplande afgifte: ${longDate(m.expectedDeliveryDate)}`}>
              <IconCalendar {...SMALL} />
              {shortDate(m.expectedDeliveryDate)}
            </span>
          )}
        </div>
      </div>
      {menu}
    </div>
  )
}

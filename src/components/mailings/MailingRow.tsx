'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconBuilding, IconCalendar, IconMail, IconMailOff, IconWorld } from '@tabler/icons-react'
import type { MailingSummary } from '@/core/masspost/store/mailing'
import { addressesInfo, excludedInfo, foreignInfo } from '@/components/mailing-flow/pill-info'
import { printerReady } from '@/components/mailing-flow/exports'
import { FIELD_TIPS } from '@/components/mailing-flow/field-tips'
import { ArrMark } from './ArrMark'
import { formatPercent, longDate, shortDate } from './labels'
import { RowMenu } from './RowMenu'
import { StatusIcon } from './StatusIcon'
import styles from '@/components/app-shell/app.module.css'

const SMALL = { size: 14, stroke: 1.75, 'aria-hidden': true } as const

/**
 * One mailing in the list: on one line, or on two lines in a narrow area (SR-112 decision 10).
 * Pills right to left, most common first (Mark, 14/10): date · ARR · addresses · abroad · excluded ·
 * Test/Certificatie · PS · R&S · customer.
 * @param props The row, the layout and the menu actions.
 */
export function MailingRow({
  mailing: m,
  twoLines,
  onPrinter,
  onArchive,
  onRestore,
  onCustomer,
}: {
  mailing: MailingSummary
  twoLines: boolean
  onPrinter: () => void
  onArchive: () => void
  onRestore: () => void
  /** Click on the customer: the list is searched for that customer. */
  onCustomer: (customer: string) => void
}) {
  const router = useRouter()
  const href = `/mailings/${encodeURIComponent(m.code)}`
  const code = <span className={styles.code}>{m.code}</span>
  const title = (
    <Link className={styles.title} href={href} title={m.title} data-row-link="">
      {m.title}
    </Link>
  )

  // Left → right = reverse of the right-to-left reading order (most common on the right).
  const customer = m.customer ? (
    <button
      type="button"
      className={`${styles.pill} ${styles.pillBtn}`}
      data-tip={`Zoek op klant: ${m.customer}`}
      onClick={() => onCustomer(m.customer)}
    >
      <IconBuilding {...SMALL} />
      <span>{m.customer}</span>
    </button>
  ) : null
  const roundSeq = m.roundAndSequence ? (
    <span className={styles.pill} data-tip={FIELD_TIPS.roundSequence}>
      R&S
    </span>
  ) : null
  const presort = m.genPSC === 'Y' ? (
    <span className={styles.pill} data-tip={FIELD_TIPS.presort}>
      PS
    </span>
  ) : null
  const submittedMode =
    m.submittedMode === 'T' || m.submittedMode === 'C' ? (
      <span
        className={`${styles.pill} ${styles.pillWarn}`}
        data-tip={
          m.submittedMode === 'T'
            ? 'Ingediend in testmodus: bpost bezorgt niets'
            : 'Ingediend in certificatie'
        }
      >
        {m.submittedMode === 'T' ? 'Test' : 'Certificatie'}
      </span>
    ) : null
  const leftOutInfo = m.excluded > 0 ? excludedInfo(m.excluded) : null
  const leftOut = leftOutInfo ? (
    <span className={styles.pill} data-tip={leftOutInfo.tip}>
      <IconMailOff {...SMALL} />
      <span>{leftOutInfo.text}</span>
    </span>
  ) : null
  const abroadInfo = m.foreign ? foreignInfo(m.foreign) : null
  const abroad = abroadInfo ? (
    <span className={`${styles.pill} ${styles.pillWarn}`} data-tip={abroadInfo.tip}>
      <IconWorld {...SMALL} />
      <span>{abroadInfo.text}</span>
    </span>
  ) : null
  const envelope = addressesInfo({ rowCount: m.addresses, excludedRows: m.excluded })
  const addresses = (
    <span className={`${styles.pill} ${envelope.warn ? styles.pillWarn : styles.pillOkSoft}`} data-tip={envelope.tip}>
      <IconMail {...SMALL} />
      <span>{envelope.text}</span>
    </span>
  )
  const arr =
    m.arr === null ? (
      <span className={`${styles.date} ${styles.muted}`} data-tip="Nog niet gecontroleerd door e-MassPost">
        —<span className={styles.srOnly}>nog geen ARR</span>
      </span>
    ) : (
      <span className={styles.pill} data-tip="ARR: deel van de adressen dat e-MassPost herkent tot op het gebouw">
        <ArrMark arr={m.arr} />
        <span>{formatPercent(m.arr)}</span>
      </span>
    )
  const date = m.expectedDeliveryDate ? (
    <span className={styles.meta} data-tip={`Geplande afgifte: ${longDate(m.expectedDeliveryDate)}`}>
      <IconCalendar {...SMALL} />
      {shortDate(m.expectedDeliveryDate)}
    </span>
  ) : (
    <span className={`${styles.date} ${styles.muted}`} data-tip="Nog geen afgiftedatum">
      —
    </span>
  )

  const pills = (
    <>
      {customer}
      {roundSeq}
      {presort}
      {submittedMode}
      {leftOut}
      {abroad}
      {addresses}
      {arr}
      {date}
    </>
  )
  const pillsTwoLines = (
    <>
      {customer}
      {roundSeq}
      {presort}
      {submittedMode}
      {leftOut}
      {abroad}
      {addresses}
      {m.arr !== null && arr}
      {m.expectedDeliveryDate && date}
    </>
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

  // The whole row opens the mailing; the link and the "…" menu keep their own behaviour.
  function onClick(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('a, button, [role="menu"]')) return
    if (e.metaKey || e.ctrlKey) window.open(href, '_blank', 'noopener')
    else router.push(href)
  }
  const rowProps = { className: styles.row, onClick, onKeyDown: moveBetweenRows }

  if (!twoLines) {
    return (
      <div {...rowProps}>
        <StatusIcon mailing={m} />
        {code}
        {title}
        <div className={styles.pills} data-pills="">
          {pills}
        </div>
        {menu}
      </div>
    )
  }
  return (
    <div {...rowProps}>
      <StatusIcon mailing={m} />
      <div className={styles.line}>
        <div className={styles.line1}>
          {title}
          {code}
        </div>
        <div className={styles.line2} data-pills="">
          {pillsTwoLines}
        </div>
      </div>
      {menu}
    </div>
  )
}

/** ↑ and ↓ on a row (its link or its closed "…" button) move the focus to the row above or below. */
function moveBetweenRows(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const target = e.target as HTMLElement
  if (target.closest('[role="menu"]')) return
  const links = [...document.querySelectorAll<HTMLElement>('[data-row-link]')]
  const own = e.currentTarget.querySelector<HTMLElement>('[data-row-link]')
  const next = links[links.indexOf(own as HTMLElement) + (e.key === 'ArrowDown' ? 1 : -1)]
  if (!next) return
  e.preventDefault()
  next.focus()
}

'use client'

import type { ReactNode } from 'react'
import {
  IconAbc,
  IconCheck,
  IconCircleCheck,
  IconColumns3,
  IconMail,
  IconMailOff,
  IconWorld,
} from '@tabler/icons-react'
import type { MappingPresetId } from '@/core/masspost/suggest-mapping'
import { PRESET_LABELS, formatCount } from './columns'
import { HARD_LIMIT, MIN_ADDRESSES, SOFT_LIMIT } from './UploadStep'
import styles from './poc.module.css'

/** One pill: an icon with a number (or a short label); the explanation is the tooltip (decision 46). */
export interface Pill {
  key: string
  icon: ReactNode
  text?: string
  tip: string
  /** `okSoft`: a check that is in order: neutral pill, only the icon green, so it does not stand out. */
  tone?: 'neutral' | 'accent' | 'warn' | 'ok' | 'okSoft'
}

const ICON = { size: 14, stroke: 1.75, 'aria-hidden': true } as const

/** What the top bar knows about the list. `columns` only in step 2, `format` only in steps 3 and 4. */
export interface ListPillsInput {
  fileName: string
  preset?: MappingPresetId
  rowCount: number
  foreignCount: number
  columns?: { mapped: number; total: number; complete: boolean }
  format?: { open: number }
  excludedRows: number
}

/**
 * The pills of the top bar, in reading order: what the file is (the recognised layout, the columns
 * mapped to the address), what we check (addresses abroad, the format), and the outcome: the
 * addresses that go to bpost and, at the far right, the rows left out (Mark, 06/10).
 * A check is orange while there is work; in order it is a neutral pill with a green icon, except the
 * format, which turns green with a tick (Mark, 06/10).
 *
 * @param input Counts and choices of the list.
 * @returns The pills, left to right.
 */
export function listPills(input: ListPillsInput): Pill[] {
  const { fileName, preset, rowCount, foreignCount, columns, format, excludedRows } = input
  const pills: Pill[] = []
  if (preset) {
    pills.push({ key: 'preset', icon: <IconCircleCheck {...ICON} />, text: PRESET_LABELS[preset].label, tip: PRESET_LABELS[preset].tip, tone: 'accent' })
  }
  if (columns) {
    pills.push({
      key: 'columns',
      icon: <IconColumns3 {...ICON} />,
      text: `${columns.mapped}/${columns.total}`,
      tip: columns.complete
        ? `${columns.mapped} van ${columns.total} kolommen gekoppeld aan het adres`
        : `${columns.mapped} van ${columns.total} kolommen gekoppeld aan het adres: een verplicht vak heeft nog geen kolom`,
      tone: columns.complete ? 'okSoft' : 'warn',
    })
  }
  if (foreignCount > 0) {
    pills.push({
      key: 'foreign',
      icon: <IconWorld {...ICON} />,
      text: formatCount(foreignCount),
      tip: `${formatCount(foreignCount)} ${foreignCount === 1 ? 'adres' : 'adressen'} in het buitenland: kijk het land na`,
      tone: 'warn',
    })
  }
  if (format) {
    // The count of open errors; at zero a tick, never the number corrected.
    pills.push(
      format.open > 0
        ? {
            key: 'format',
            icon: <IconAbc {...ICON} />,
            text: formatCount(format.open),
            tip: `${formatCount(format.open)} ${format.open === 1 ? 'formaatfout' : 'formaatfouten'} open`,
            tone: 'warn',
          }
        : {
            key: 'format',
            icon: (
              <>
                <IconAbc {...ICON} />
                <IconCheck {...ICON} />
              </>
            ),
            tip: 'Formaat in orde',
            tone: 'ok',
          },
    )
  }
  // One envelope: the addresses that go to bpost. Without exclusions that is every row.
  const included = rowCount - excludedRows
  const large = rowCount > SOFT_LIMIT
  const few = included < MIN_ADDRESSES
  const what =
    excludedRows > 0
      ? `${formatCount(included)} van de ${formatCount(rowCount)} adressen in ${fileName} gaan mee (${formatCount(excludedRows)} uitgesloten)`
      : `${formatCount(rowCount)} adressen in ${fileName}`
  pills.push({
    key: 'rows',
    icon: <IconMail {...ICON} />,
    text: formatCount(included),
    tip: large
      ? `Grote lijst: ${what}. Gewoon tot ${formatCount(SOFT_LIMIT)}; deze proef laat tot ${formatCount(HARD_LIMIT)} toe om te meten.`
      : few
        ? `${what}: minder dan de ${MIN_ADDRESSES} die bpost per mailing vraagt`
        : what,
    tone: large || few ? 'warn' : 'okSoft',
  })
  // Right of the addresses: the rows left out (Mark, 06/10).
  if (excludedRows > 0) {
    pills.push({
      key: 'excluded',
      icon: <IconMailOff {...ICON} />,
      text: formatCount(excludedRows),
      tip: `${formatCount(excludedRows)} ${excludedRows === 1 ? 'rij' : 'rijen'} uitgesloten: gaat niet mee in de mailing`,
    })
  }
  return pills
}

const TONE: Record<NonNullable<Pill['tone']>, string> = {
  neutral: '',
  accent: styles.pillAccent,
  warn: styles.pillWarn,
  ok: styles.pillOk,
  okSoft: styles.pillOkSoft,
}

/** A row of display-only pills (decision 46). */
export function MetaPills({ pills, label = 'Over deze lijst' }: { pills: Pill[]; label?: string }) {
  return (
    <ul className={styles.pills} aria-label={label}>
      {pills.map((pill) => (
        <li key={pill.key} className={`${styles.pill} ${TONE[pill.tone ?? 'neutral']}`} data-tip={pill.tip}>
          <span className={styles.pillBody} aria-hidden="true">
            {pill.icon}
            {pill.text}
          </span>
          <span className={styles.srOnly}>{pill.tip}</span>
        </li>
      ))}
    </ul>
  )
}

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
import { ArrMark } from '@/components/mailings/ArrMark'
import { formatPercent } from '@/components/mailings/labels'
import { addressesInfo, foreignInfo } from './pill-info'
import styles from './mailing-flow.module.css'

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
  /** The ARR of the last address check (step 4); absent or null: no pill. */
  arr?: number | null
}

/**
 * The pills of the top bar, in reading order: what the file is (the recognised layout, the columns
 * mapped to the address), what we check (addresses abroad, the format), and the outcome: the
 * addresses that go to bpost and, at the far right, the rows left out (Mark, 06/10).
 * A check is orange while there is work; in order it is a neutral pill with a green icon, except the
 * format, which turns green with a tick (Mark, 06/10). The columns count has no colour.
 *
 * @param input Counts and choices of the list.
 * @returns The pills, left to right.
 */
export function listPills(input: ListPillsInput): Pill[] {
  const { fileName, preset, rowCount, foreignCount, columns, format, excludedRows, arr } = input
  const pills: Pill[] = []
  if (preset) {
    pills.push({ key: 'preset', icon: <IconCircleCheck {...ICON} />, text: PRESET_LABELS[preset].label, tip: PRESET_LABELS[preset].tip, tone: 'accent' })
  }
  if (columns) {
    // No colour: the count says how many columns are used, not whether the mapping is complete
    // (the step bar and the message in the step say that).
    pills.push({
      key: 'columns',
      icon: <IconColumns3 {...ICON} />,
      text: `${columns.mapped}/${columns.total}`,
      tip: columns.complete
        ? `${columns.mapped} van ${columns.total} kolommen gekoppeld aan het adres`
        : `${columns.mapped} van ${columns.total} kolommen gekoppeld aan het adres: een verplicht vak heeft nog geen kolom`,
    })
  }
  if (foreignCount > 0) {
    const { text, tip } = foreignInfo(foreignCount)
    pills.push({ key: 'foreign', icon: <IconWorld {...ICON} />, text, tip, tone: 'warn' })
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
  const rows = addressesInfo({ rowCount, excludedRows, fileName })
  pills.push({ key: 'rows', icon: <IconMail {...ICON} />, text: rows.text, tip: rows.tip, tone: rows.warn ? 'warn' : 'okSoft' })
  // Step 4: the ARR, neutral with an orange dot, a green dot or the gold star (design 13/10, decision 20).
  if (arr != null) {
    const now = `ARR van e-MassPost: ${formatPercent(arr)}.`
    pills.push({
      key: 'arr',
      icon: <ArrMark arr={arr} />,
      text: formatPercent(arr),
      tip:
        arr < 96
          ? `${now} Indienen kan vanaf 96 %.`
          : arr < 98
            ? `${now} Nog ${formatPercent(98 - arr)} tot de extra korting vanaf 98 %.`
            : `${now} Vanaf 98 % krijg je extra korting voor datakwaliteit.`,
    })
  }
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

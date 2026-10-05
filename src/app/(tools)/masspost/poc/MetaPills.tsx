'use client'

import type { ReactNode } from 'react'
import {
  IconAbc,
  IconBan,
  IconCheck,
  IconCircleCheck,
  IconColumns3,
  IconMail,
  IconMailForward,
  IconWorld,
} from '@tabler/icons-react'
import type { MappingPresetId } from '@/core/masspost/suggest-mapping'
import { PRESET_LABELS, formatCount } from './columns'
import { HARD_LIMIT, SOFT_LIMIT } from './UploadStep'
import styles from './poc.module.css'

/** One pill: an icon with a number (or a short label); the explanation is the tooltip (decision 46). */
export interface Pill {
  key: string
  icon: ReactNode
  text?: string
  tip: string
  tone?: 'neutral' | 'accent' | 'warn' | 'ok'
}

const ICON = { size: 14, stroke: 1.75, 'aria-hidden': true } as const

/** The pills every step starts with: the recognised layout, the number of addresses (the file name
 *  is in its tooltip) and, when there are any, the addresses abroad (orange: check the country, Q-015). */
export function basePills(fileName: string, preset: MappingPresetId | undefined, rowCount: number, foreignCount: number): Pill[] {
  const pills: Pill[] = []
  if (preset) {
    pills.push({ key: 'preset', icon: <IconCircleCheck {...ICON} />, text: PRESET_LABELS[preset].label, tip: PRESET_LABELS[preset].tip, tone: 'accent' })
  }
  const large = rowCount > SOFT_LIMIT
  pills.push({
    key: 'rows',
    icon: <IconMail {...ICON} />,
    text: formatCount(rowCount),
    tip: large
      ? `Grote lijst: ${formatCount(rowCount)} adressen in ${fileName}. Gewoon tot ${formatCount(SOFT_LIMIT)}; deze proef laat tot ${formatCount(HARD_LIMIT)} toe om te meten.`
      : `${formatCount(rowCount)} adressen in ${fileName}`,
    tone: large ? 'warn' : 'neutral',
  })
  if (foreignCount > 0) {
    pills.push({
      key: 'foreign',
      icon: <IconWorld {...ICON} />,
      text: formatCount(foreignCount),
      tip: `${formatCount(foreignCount)} ${foreignCount === 1 ? 'adres' : 'adressen'} in het buitenland: kijk het land na`,
      tone: 'warn',
    })
  }
  return pills
}

/** Step 2: how many columns feed the address. */
export function columnsPill(mapped: number, total: number): Pill {
  return { key: 'columns', icon: <IconColumns3 {...ICON} />, text: `${mapped}/${total}`, tip: `${mapped} van ${total} kolommen gekoppeld aan het adres` }
}

/** Steps 3 and 4: open format errors (orange) or "format in order" (green), and the excluded rows. */
export function formatPills(open: number, excludedRows: number): Pill[] {
  const pills: Pill[] = [
    open > 0
      ? {
          key: 'format',
          icon: <IconAbc {...ICON} />,
          text: formatCount(open),
          tip: `${formatCount(open)} ${open === 1 ? 'formaatfout' : 'formaatfouten'} open`,
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
  ]
  if (excludedRows > 0) {
    pills.push({
      key: 'excluded',
      icon: <IconBan {...ICON} />,
      text: formatCount(excludedRows),
      tip: `${formatCount(excludedRows)} ${excludedRows === 1 ? 'rij' : 'rijen'} uitgesloten: gaat niet mee in de mailing`,
    })
  }
  return pills
}

/** Step 4: how many addresses go to bpost. */
export function includedPill(included: number): Pill {
  return { key: 'included', icon: <IconMailForward {...ICON} />, text: formatCount(included), tip: `${formatCount(included)} adressen gaan mee` }
}

const TONE: Record<NonNullable<Pill['tone']>, string> = {
  neutral: '',
  accent: styles.pillAccent,
  warn: styles.pillWarn,
  ok: styles.pillOk,
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

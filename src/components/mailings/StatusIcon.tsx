import type { MailingSummary } from '@/core/masspost/store/mailing'
import { arrTone, formatPercent, statusLabel } from './labels'
import styles from '@/components/app-shell/app.module.css'

const SLICE = {
  q: 'M10 10 L10 2 A8 8 0 0 1 18 10 Z',
  h: 'M10 10 L10 2 A8 8 0 0 1 10 18 Z',
  t: 'M10 10 L10 2 A8 8 0 1 1 2 10 Z',
} as const

function Ball({ color, slice, size }: { color: string; slice?: keyof typeof SLICE; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="1.5" />
      {slice && <path d={SLICE[slice]} fill={color} />}
    </svg>
  )
}

function Full({ color, mark, size }: { color: string; mark?: '!'; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill={color} />
      {mark === '!' ? (
        <>
          <line x1="10" y1="5.5" x2="10" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="10" cy="14.3" r="1.2" fill="#fff" />
        </>
      ) : (
        <path d="M6.3 10.3 L8.8 12.7 L13.8 7.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

const ARR_COLOR = { red: 'var(--red)', orange: 'var(--orange)', green: 'var(--green)' } as const

/**
 * The Harvey ball of a status (docs/ontwerp/webapp/statusiconen.html), with its meaning as hover tip
 * and for screen readers. In the list (20 px) and before the title of a mailing (larger): always the
 * status of the mailing as stored, whatever step you look at. A new mailing that is not saved yet
 * shows the empty grey circle with a dotted line (`HarveyBall dashed`, in step 1).
 * @param props The mailing, and the size in pixels.
 */
export function StatusIcon({ mailing, size = 20 }: { mailing: MailingSummary; size?: number }) {
  const label = statusLabel(mailing) + (mailing.status === 'checked' && mailing.arr !== null ? ` · ARR ${formatPercent(mailing.arr)}` : '')
  const icon = (() => {
    switch (mailing.status) {
      case 'uploaded':
        return <Ball color="var(--text-muted)" size={size} />
      case 'mapped':
        return <Ball color="var(--yellow)" slice="q" size={size} />
      case 'format':
        return <Ball color="var(--yellow)" slice="h" size={size} />
      case 'checked':
        return <Ball color={ARR_COLOR[arrTone(mailing.arr ?? 0)]} slice="t" size={size} />
      case 'submitted':
        return <Full color="var(--green)" size={size} />
      case 'overdue':
        return <Full color="var(--orange)" mark="!" size={size} />
      case 'done':
        return <Full color="var(--done)" size={size} />
      case 'withdrawn':
        return (
          // A cross, not the dotted line: that one means "not saved yet" (Mark, 13/10).
          <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" />
            <path d="M6.8 6.8 L13.2 13.2 M13.2 6.8 L6.8 13.2" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )
    }
  })()
  return (
    <span className={`${styles.status} ${styles.tipStart}`} data-tip={label}>
      {icon}
      <span className={styles.srOnly}>{label}</span>
    </span>
  )
}

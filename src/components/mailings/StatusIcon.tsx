import type { MailingSummary } from '@/core/masspost/store/mailing'
import { arrTone, formatPercent, statusLabel } from './labels'
import styles from '@/components/app-shell/app.module.css'

const SLICE = {
  q: 'M10 10 L10 2 A8 8 0 0 1 18 10 Z',
  h: 'M10 10 L10 2 A8 8 0 0 1 10 18 Z',
  t: 'M10 10 L10 2 A8 8 0 1 1 2 10 Z',
} as const

function Ball({ color, slice }: { color: string; slice?: keyof typeof SLICE }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke={color} strokeWidth="1.5" />
      {slice && <path d={SLICE[slice]} fill={color} />}
    </svg>
  )
}

function Full({ color, mark }: { color: string; mark?: '!' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
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
 * and for screen readers.
 * @param props The row.
 */
export function StatusIcon({ mailing }: { mailing: MailingSummary }) {
  const label = statusLabel(mailing) + (mailing.status === 'checked' && mailing.arr !== null ? ` · ARR ${formatPercent(mailing.arr)}` : '')
  const icon = (() => {
    switch (mailing.status) {
      case 'uploaded':
        return <Ball color="var(--text-muted)" />
      case 'mapped':
        return <Ball color="var(--yellow)" slice="q" />
      case 'format':
        return <Ball color="var(--yellow)" slice="h" />
      case 'checked':
        return <Ball color={ARR_COLOR[arrTone(mailing.arr ?? 0)]} slice="t" />
      case 'submitted':
        return <Full color="var(--green)" />
      case 'overdue':
        return <Full color="var(--orange)" mark="!" />
      case 'done':
        return <Full color="var(--done)" />
      case 'withdrawn':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="2.5 2" />
            <line x1="5" y1="15" x2="15" y2="5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )
    }
  })()
  return (
    <span className={styles.status} title={label}>
      {icon}
      <span className={styles.srOnly}>{label}</span>
    </span>
  )
}

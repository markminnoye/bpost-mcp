// Harvey balls and the waiting wheel from docs/ontwerp/webapp/statusiconen.html (decisions 17, 18, 21).
import { IconColumns3 } from '@tabler/icons-react'
import styles from './poc.module.css'

/** Rows: the column icon of the top bar turned a quarter, so rows and columns read as a pair.
 *  Tabler has no three-rows icon. */
export function IconRows3({ size = 14 }: { size?: number }) {
  return <IconColumns3 size={size} stroke={1.75} aria-hidden="true" style={{ transform: 'rotate(90deg)' }} />
}

const SLICES = {
  0.25: 'M10 10 L10 2 A8 8 0 0 1 18 10 Z',
  0.5: 'M10 10 L10 2 A8 8 0 0 1 10 18 Z',
  0.75: 'M10 10 L10 2 A8 8 0 1 1 2 10 Z',
} as const

/** Empty circle = uploaded, ¼ = columns mapped, ½ = format validation, ¾ = address check.
 *  Grey until the step has a status; the caller passes the status color. */
export function HarveyBall({ fill, color }: { fill: 0 | 0.25 | 0.5 | 0.75; color?: string }) {
  const tint = color ?? 'var(--text-muted)'
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke={tint} strokeWidth="1.5" />
      {fill !== 0 && <path d={SLICES[fill]} fill={tint} />}
    </svg>
  )
}

const SPOKES = Array.from({ length: 12 }, (_, i) => i)

/** One animation for every wait: a wheel with spokes. A CSS transform on its own layer, so the
 *  browser can keep it turning while the page reads a large file. */
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span className={styles.spin}>
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {SPOKES.map((i) => (
            <line
              key={i}
              x1="10"
              y1="2"
              x2="10"
              y2="5.5"
              opacity={i === 0 ? 1 : 0.2 + (i - 1) * 0.072}
              transform={`rotate(${i * 30} 10 10)`}
            />
          ))}
        </g>
      </svg>
    </span>
  )
}

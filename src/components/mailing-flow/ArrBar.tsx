import { STAR_PATH } from '@/components/mailings/ArrMark'
import { arrTone, formatPercent } from '@/components/mailings/labels'
import styles from './mailing-flow.module.css'

/** Yellow under 96 %, green from 96 % (design 13/10, decision 20). */
const colour = (arr: number) => (arrTone(arr) === 'low' ? 'var(--yellow)' : 'var(--green)')
/** Position on the bar, which runs from 90 to 100 %. */
const pos = (x: number) => `${Math.max(0, Math.min(100, (x - 90) * 10))}%`

/** The end point of the bar: a dot, or the gold star from 98 % (the extra discount). */
function EndPoint({ value, phantom = false }: { value: number; phantom?: boolean }) {
  const cls = `${styles.arrDot} ${phantom ? styles.arrDotPhantom : ''}`
  return arrTone(value) === 'bonus' ? (
    <span className={`${cls} ${styles.arrStar}`} style={{ left: pos(value) }}>
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" data-star="">
        <path d={STAR_PATH} fill="var(--gold)" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span className={cls} style={{ left: pos(value), background: colour(value) }} />
  )
}

/**
 * The ARR of e-MassPost (sketch adrescontrole.html v4.6): the number with its status ball, a bar from
 * 90 to 100 % with the marks of 96 % (submitting) and 98 % (extra discount), and the estimate after your
 * changes as a lighter phantom part (decision 39 of 02/10). From 98 % the end point is a gold star.
 * @param props The ARR of e-MassPost and the estimate (null: none).
 */
export function ArrBar({ arr, estimate }: { arr: number; estimate: number | null }) {
  const moved = estimate !== null && Math.abs(estimate - arr) >= 0.05
  const low = moved ? Math.min(arr, estimate!) : arr
  return (
    <section className={styles.score} aria-label="Score">
      <div className={styles.scoreBig}>
        <svg width="28" height="28" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="none" stroke={colour(arr)} strokeWidth="1.5" />
          <path d="M10 10 L10 2 A8 8 0 1 1 2 10 Z" fill={colour(arr)} />
        </svg>
        <div>
          <div className={styles.scoreN}>{formatPercent(arr)}</div>
          <div className={styles.scoreL} title="Address Recognition Rate: deel van de adressen dat e-MassPost herkent tot op het gebouw">
            ARR van e-MassPost
          </div>
        </div>
      </div>
      <div>
        <div
          className={styles.arrTrack}
          role="meter"
          aria-label="ARR van e-MassPost"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={arr}
          aria-valuetext={
            moved
              ? `${formatPercent(arr)}. Verwacht na jouw aanpassingen: ${formatPercent(estimate!)}.`
              : formatPercent(arr)
          }
        >
          <span className={styles.arrFill} style={{ width: pos(low), background: colour(arr) }} />
          {moved && (
            <span
              className={styles.arrPhantom}
              style={{ left: pos(low), width: `calc(${pos(Math.max(arr, estimate!))} - ${pos(low)})`, background: colour(estimate!) }}
            />
          )}
          <span className={styles.arrMark} style={{ left: '60%' }} data-tip="Vanaf 96 % kan je indienen.">
            <span>96 %</span>
          </span>
          <span className={styles.arrMark} style={{ left: '80%' }} data-tip="Vanaf 98 % krijg je extra korting voor datakwaliteit.">
            <span>98 %</span>
          </span>
          <EndPoint value={arr} />
          {moved && <EndPoint value={estimate!} phantom />}
        </div>
        <p className={styles.m}>
          {moved
            ? `Verwacht na jouw aanpassingen: ${formatPercent(estimate!)} (schatting; enkel e-MassPost geeft de echte score).`
            : 'Nog geen aanpassingen sinds de laatste controle.'}
        </p>
      </div>
    </section>
  )
}

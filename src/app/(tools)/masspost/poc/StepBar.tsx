'use client'

import { IconChevronRight } from '@tabler/icons-react'
import { HarveyBall } from './StatusIcons'
import styles from './poc.module.css'

export type StepId = 'upload' | 'mapping' | 'format' | 'check'

/** Status of a step: none yet (grey), action needed (yellow, decision 21) or in order (green). */
export type StepStatus = 'none' | 'action' | 'done'

const STATUS_COLOR: Record<StepStatus, string | undefined> = {
  none: undefined,
  action: 'var(--yellow)',
  done: 'var(--green)',
}

const STEPS: readonly { id: StepId; label: string; fill: 0 | 0.25 | 0.5 | 0.75 }[] = [
  { id: 'upload', label: 'Importeren', fill: 0 },
  { id: 'mapping', label: 'Koppelen', fill: 0.25 },
  { id: 'format', label: 'Formaatvalidatie', fill: 0.5 },
  { id: 'check', label: 'Adrescontrole', fill: 0.75 },
]

/** The first four steps of a mailing, with the icon each step has in the overview, an arrow between
 *  the steps (variant B) and under each step a segment of one bar (variant C): filled as far as the
 *  step is done, in its status colour.
 *  The icon is grey until the step has a status. Every reachable step other than the current one is a
 *  link, also forwards: going back does not throw away a later step that is still valid. */
export function StepBar({
  current,
  status,
  progress,
  reachable,
  onGo,
}: {
  current: StepId
  status: Partial<Record<StepId, StepStatus>>
  /** How far each step is, from 0 to 1. */
  progress: Partial<Record<StepId, number>>
  reachable: Partial<Record<StepId, boolean>>
  onGo: (step: StepId) => void
}) {
  return (
    <nav aria-label="Stappen">
      <ol className={styles.steps}>
        {STEPS.map((step, index) => {
          const isCurrent = step.id === current
          // The current step stands out in full colour; without a status its icon is not grey but in text colour.
          const color = STATUS_COLOR[status[step.id] ?? 'none'] ?? (isCurrent ? 'var(--text-primary)' : undefined)
          const done = Math.round((progress[step.id] ?? 0) * 100)
          const tip = `${step.label}: ${done} % klaar`
          const content = (
            <>
              <HarveyBall fill={step.fill} color={color} />
              <span>
                {index + 1}. {step.label}
              </span>
              <span className={styles.srOnly}>, {done} % klaar</span>
            </>
          )
          // The bar under the step, and an arrow to the next step (variant B on top of C).
          const track = (
            <>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.trackFill} style={{ width: `${done}%`, background: color ?? 'var(--text-muted)' }} />
              </span>
              {index < STEPS.length - 1 && (
                <IconChevronRight className={styles.stepArrow} size={14} stroke={1.75} aria-hidden="true" />
              )}
            </>
          )
          if (!isCurrent && reachable[step.id]) {
            return (
              <li key={step.id}>
                <button type="button" className={`${styles.step} ${styles.tipBelow}`} data-tip={tip} onClick={() => onGo(step.id)}>
                  {content}
                </button>
                {track}
              </li>
            )
          }
          return (
            <li key={step.id} className={isCurrent ? styles.stepItemCurrent : undefined}>
              <span
                className={`${styles.step} ${styles.tipBelow} ${isCurrent ? styles.stepCurrent : styles.stepTodo}`}
                data-tip={tip}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {content}
              </span>
              {track}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

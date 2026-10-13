'use client'

import { IconChevronRight } from '@tabler/icons-react'
import { HarveyBall } from './StatusIcons'
import styles from './mailing-flow.module.css'

export type StepId = 'upload' | 'mapping' | 'format' | 'check'

/** Status of a step: none yet, action needed (yellow, decision 21), or in order (green). */
export type StepStatus = 'none' | 'action' | 'done'

/** Colour of the bar segment: the status colour; without a status the current step in the accent colour. */
const BAR_COLOR: Record<StepStatus, string | undefined> = {
  none: undefined,
  action: 'var(--yellow)',
  done: 'var(--green)',
}

/** The four steps; `fill` is the Harvey ball of the step (decisions 17 and 18). */
export const STEPS: readonly { id: StepId; label: string; fill: 0 | 0.25 | 0.5 | 0.75 }[] = [
  { id: 'upload', label: 'Importeren', fill: 0 },
  { id: 'mapping', label: 'Koppelen', fill: 0.25 },
  { id: 'format', label: 'Formaatvalidatie', fill: 0.5 },
  { id: 'check', label: 'Adrescontrole', fill: 0.75 },
]

/**
 * The status before the title of a mailing: the Harvey ball of the current step, filled per quarter
 * as the steps go, black, and green once the step is ready for the next one (Mark, 12/10 and 13/10).
 * @param props The current step, its status and how far it is (0 to 1).
 */
export function StepStatusIcon({ step, status, progress }: { step: StepId; status?: StepStatus; progress?: number }) {
  const index = STEPS.findIndex((s) => s.id === step)
  const { label, fill } = STEPS[index]
  const tip = `${index + 1}. ${label}: ${status === 'done' ? 'in orde' : `${Math.round((progress ?? 0) * 100)} % klaar`}`
  return (
    <span className={`${styles.titleStatus} ${styles.tipStart}`} data-tip={tip}>
      <HarveyBall fill={fill} color={status === 'done' ? 'var(--green)' : 'var(--text-primary)'} size={22} />
      <span className={styles.srOnly}>{tip}</span>
    </span>
  )
}

/** The first four steps of a mailing, with the icon each step has in the overview, an arrow between
 *  the steps (variant B) and under each step a segment of one bar (variant C), filled as far as the
 *  step is done, in its status colour (yellow: something to do, green: in order; the current step
 *  without a status in the accent colour). The icon is black until the step is ready for the next
 *  one, then green (Mark, 12/10). Every reachable step other than the current one is a link, also forwards: going
 *  back does not throw away a later step that is still valid.
 *  The bar has a fixed width, so the four steps are equally wide in every step. */
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
    <nav aria-label="Stappen" className={styles.stepNav}>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => {
          const isCurrent = step.id === current
          const bar = BAR_COLOR[status[step.id] ?? 'none'] ?? (isCurrent ? 'var(--accent)' : 'var(--text-muted)')
          const done = Math.round((progress[step.id] ?? 0) * 100)
          const tip = `${step.label}: ${done} % klaar`
          const content = (
            <>
              <span className={styles.stepLabel} data-label={`${index + 1}. ${step.label}`}>
                {index + 1}. {step.label}
              </span>
              <span className={styles.srOnly}>, {done} % klaar</span>
            </>
          )
          // The bar under the step, and an arrow to the next step (variant B on top of C).
          const track = (
            <>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.trackFill} style={{ width: `${done}%`, background: bar }} />
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

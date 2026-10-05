'use client'

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
  { id: 'upload', label: 'Opladen', fill: 0 },
  { id: 'mapping', label: 'Koppelen', fill: 0.25 },
  { id: 'format', label: 'Formaatvalidatie', fill: 0.5 },
  { id: 'check', label: 'Adrescontrole', fill: 0.75 },
]

/** The first four steps of a mailing, with the icon each step has in the overview. The icon is grey
 *  until the step has a status. Steps before the current one are links back. */
export function StepBar({
  current,
  status,
  onGo,
}: {
  current: StepId
  status: Partial<Record<StepId, StepStatus>>
  onGo: (step: StepId) => void
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)
  return (
    <nav aria-label="Stappen">
      <ol className={styles.steps}>
        {STEPS.map((step, index) => {
          const content = (
            <>
              <HarveyBall fill={step.fill} color={STATUS_COLOR[status[step.id] ?? 'none']} />
              <span>
                {index + 1}. {step.label}
              </span>
            </>
          )
          if (index < currentIndex) {
            return (
              <li key={step.id}>
                <button type="button" className={styles.step} onClick={() => onGo(step.id)}>
                  {content}
                </button>
              </li>
            )
          }
          return (
            <li key={step.id}>
              <span
                className={`${styles.step} ${index === currentIndex ? styles.stepCurrent : styles.stepTodo}`}
                aria-current={index === currentIndex ? 'step' : undefined}
              >
                {content}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

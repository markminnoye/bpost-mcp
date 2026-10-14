import { isWaiting, type Mailing } from '@/core/masspost/store/mailing'
import type { StepId } from './StepBar'

/**
 * The furthest step with a valid result (decision 52 of 02/10). Step 1 is never resumed: the
 * mailing exists, so its file was read.
 * @param m The stored mailing.
 * @returns The step to open.
 */
export function resumeStep(m: Mailing): StepId {
  if (!m.mapping) return 'mapping'
  // Sent to e-MassPost or checked: step 4, also when a format error was opened again since.
  if (m.status === 'checked' || m.status === 'submitted' || isWaiting(m)) return 'check'
  if (m.counts.formatIssuesOpen === 0) return 'check'
  return 'format'
}

/**
 * The corrections and exclusions as the format step keeps them.
 * @param m The stored mailing.
 * @returns Values by `<seq>:<field>` and excluded rows by seq.
 */
export function formatStateFromMailing(m: Mailing): { values: Record<string, string>; excluded: Record<number, true> } {
  return {
    values: { ...m.corrections },
    excluded: Object.fromEntries(m.excludedRows.map((seq) => [seq, true as const])),
  }
}

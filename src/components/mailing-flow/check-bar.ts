import type { StepStatus } from './StepBar'

/** How far the bar under Adrescontrole fills once e-MassPost has acknowledged the file. */
export const ACK_PROGRESS = 1 / 3

/**
 * Whether this exchange was acknowledged. A refusal is not an acknowledgement.
 * @param state Last state of the exchange.
 * @param receivedAt Time of the acknowledgement, kept after the result is processed.
 * @returns True after a `_1AK` that accepted the file.
 */
export function checkAcknowledged(
  state: 'sent' | 'received' | 'processed' | 'rejected' | undefined,
  receivedAt?: string | null,
): boolean {
  return state === 'received' || (state === 'processed' && !!receivedAt)
}

/**
 * Colour and fill of the bar under Adrescontrole.
 *
 * An acknowledgement fills about a third, in green, before a score exists. A score uses the
 * scale from 90 % (empty) to 96 % (full): yellow under 96 %, green from 96 %. That fill never
 * shrinks below the acknowledgement.
 *
 * @param input Whether a file was sent, whether e-MassPost acknowledged it, and the score if any.
 * @returns The status colour and a fill from 0 to 1.
 * @example
 * checkStepBar({ arr: null, sent: true, acknowledged: true })
 * // { status: 'done', progress: 1/3 }
 */
export function checkStepBar(input: {
  /** ARR of the last processed check, or the estimate after later edits. Null when there is no score yet. */
  arr: number | null
  /** A check file was sent. */
  sent: boolean
  /** e-MassPost acknowledged the file this bar follows. */
  acknowledged: boolean
}): { status: StepStatus; progress: number } {
  if (input.arr === null) {
    if (input.acknowledged) return { status: 'done', progress: ACK_PROGRESS }
    return { status: input.sent ? 'action' : 'none', progress: 0 }
  }
  const scaled = Math.max(0, Math.min(1, (input.arr - 90) / 6))
  return {
    status: input.arr >= 96 ? 'done' : 'action',
    progress: Math.max(input.acknowledged ? ACK_PROGRESS : 0, scaled),
  }
}

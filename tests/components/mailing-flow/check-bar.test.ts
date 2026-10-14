import { describe, expect, it } from 'vitest'
import { ACK_PROGRESS, checkAcknowledged, checkStepBar } from '@/components/mailing-flow/check-bar'

describe('checkStepBar', () => {
  it('stays empty until a file is sent', () => {
    expect(checkStepBar({ arr: null, sent: false, acknowledged: false })).toEqual({ status: 'none', progress: 0 })
  })

  it('stays empty, in the action colour, once the file is sent and not yet acknowledged', () => {
    expect(checkStepBar({ arr: null, sent: true, acknowledged: false })).toEqual({ status: 'action', progress: 0 })
  })

  it('fills about a third in green once e-MassPost acknowledged the file', () => {
    expect(checkStepBar({ arr: null, sent: true, acknowledged: true })).toEqual({ status: 'done', progress: ACK_PROGRESS })
  })

  it('keeps at least that third when the score is low, and turns yellow under 96 %', () => {
    expect(checkStepBar({ arr: 89, sent: true, acknowledged: true })).toEqual({ status: 'action', progress: ACK_PROGRESS })
    const mid = checkStepBar({ arr: 93, sent: true, acknowledged: true })
    expect(mid.status).toBe('action')
    expect(mid.progress).toBeGreaterThan(ACK_PROGRESS)
    expect(mid.progress).toBeCloseTo((93 - 90) / 6)
  })

  it('follows the score alone when the file was never acknowledged', () => {
    expect(checkStepBar({ arr: 93, sent: true, acknowledged: false }).progress).toBeCloseTo((93 - 90) / 6)
  })

  it('is full and green from 96 %', () => {
    expect(checkStepBar({ arr: 96, sent: true, acknowledged: true })).toEqual({ status: 'done', progress: 1 })
    expect(checkStepBar({ arr: 99.8, sent: true, acknowledged: false })).toEqual({ status: 'done', progress: 1 })
  })
})

describe('checkAcknowledged', () => {
  it('is true after an acknowledgement, and after a result that followed one', () => {
    expect(checkAcknowledged('received', '2026-10-13T14:07:00')).toBe(true)
    expect(checkAcknowledged('processed', '2026-10-13T14:07:00')).toBe(true)
  })

  it('is false when the file was only sent, refused, or answered without an acknowledgement', () => {
    expect(checkAcknowledged('sent')).toBe(false)
    expect(checkAcknowledged('rejected', '2026-10-13T14:07:00')).toBe(false)
    expect(checkAcknowledged('processed', null)).toBe(false)
    expect(checkAcknowledged(undefined)).toBe(false)
  })
})

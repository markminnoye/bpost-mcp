// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { listPills } from '@/components/mailing-flow/MetaPills'

const base = { fileName: 'a.xlsx', rowCount: 789, foreignCount: 0, excludedRows: 3 }

describe('listPills, the ARR of step 4 (design 13/10, decision 20)', () => {
  it('adds a neutral ARR pill after the addresses, with its explanation', () => {
    const pills = listPills({ ...base, arr: 97.2 })
    const arr = pills.find((p) => p.key === 'arr')!
    expect(arr).toMatchObject({ text: '97,2 %', tip: 'ARR van e-MassPost: 97,2 %. Nog 0,8 % tot de extra korting vanaf 98 %.' })
    expect(arr.tone ?? 'neutral').toBe('neutral')
    expect(pills.map((p) => p.key)).toEqual(['rows', 'arr', 'excluded'])
  })

  it('explains the limit under 96 % and the discount from 98 %', () => {
    expect(listPills({ ...base, arr: 93.4 }).find((p) => p.key === 'arr')?.tip).toBe('ARR van e-MassPost: 93,4 %. Indienen kan vanaf 96 %.')
    expect(listPills({ ...base, arr: 99.8 }).find((p) => p.key === 'arr')?.tip).toBe(
      'ARR van e-MassPost: 99,8 %. Vanaf 98 % krijg je extra korting voor datakwaliteit.',
    )
  })

  it('has no ARR pill without a check', () => {
    expect(listPills(base).some((p) => p.key === 'arr')).toBe(false)
  })
})

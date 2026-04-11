import { describe, it, expect } from 'vitest'
import { validateMappingTargets } from '@/lib/batch/validate-mapping-targets'

describe('validateMappingTargets', () => {
  it('accepts known flat fields', () => {
    const result = validateMappingTargets({ A: 'lang', B: 'priority' })
    expect(result).toBeNull()
  })

  it('accepts Comps.<code> for valid BPost comp codes', () => {
    const result = validateMappingTargets({
      A: 'Comps.1', B: 'Comps.2', C: 'Comps.9', D: 'Comps.70',
    })
    expect(result).toBeNull()
  })

  it('rejects unknown flat fields', () => {
    const result = validateMappingTargets({ A: 'firstName', B: 'lang' })
    expect(result).not.toBeNull()
    expect(result!.unknownTargets).toContain('firstName')
  })

  it('rejects invalid Comps codes', () => {
    const result = validateMappingTargets({ A: 'Comps.99' })
    expect(result).not.toBeNull()
    expect(result!.unknownTargets).toContain('Comps.99')
  })

  it('rejects bare "Comps" without dot-notation', () => {
    const result = validateMappingTargets({ A: 'Comps' })
    expect(result).not.toBeNull()
    expect(result!.hint).toContain('Comps.<code>')
  })

  it('includes a hint explaining Comps syntax when Comps-related target fails', () => {
    const result = validateMappingTargets({ A: 'Comps.999' })
    expect(result).not.toBeNull()
    expect(result!.hint).toContain('Comps.<code>')
  })
})

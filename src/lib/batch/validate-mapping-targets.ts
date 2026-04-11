import { ItemSchema } from '@/schemas/mailing-request'

/** Valid BPost comp codes (from CompCodeSchema). */
const VALID_COMP_CODES = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
  '90', '91', '92', '93',
])

const KNOWN_FLAT_FIELDS = new Set(Object.keys(ItemSchema.shape))

const COMPS_HINT =
  'To map address columns, use Comps.<code> dot-notation. ' +
  'Example: { "Familienaam": "Comps.1", "Voornaam": "Comps.2", "Straatnaam": "Comps.3", "Huisnummer": "Comps.4", "Bus": "Comps.5", "Postcode": "Comps.8", "Gemeente": "Comps.9" }. ' +
  'Valid codes: 1-19 (address components), 70-79, 90-93. See BPost e-MassPost protocol for the full code table.'

export interface TargetValidationError {
  unknownTargets: string[]
  hint: string
}

export function validateMappingTargets(
  mapping: Record<string, string>,
): TargetValidationError | null {
  const unknownTargets: string[] = []
  let compsRelated = false

  for (const target of Object.values(mapping)) {
    if (KNOWN_FLAT_FIELDS.has(target) && target !== 'Comps') {
      // Valid flat field (but bare "Comps" is not valid — must use dot-notation)
      continue
    }

    if (target.startsWith('Comps.')) {
      const code = target.slice(6)
      if (VALID_COMP_CODES.has(code)) continue
      unknownTargets.push(target)
      compsRelated = true
      continue
    }

    if (target === 'Comps') {
      unknownTargets.push(target)
      compsRelated = true
      continue
    }

    unknownTargets.push(target)
  }

  if (unknownTargets.length === 0) return null

  const knownList = [...KNOWN_FLAT_FIELDS].filter(f => f !== 'Comps').join(', ')
  const baseMsg = `Mapping references unknown target fields: ${unknownTargets.join(', ')}. Known flat fields: ${knownList}.`
  const hint = compsRelated ? `${baseMsg} ${COMPS_HINT}` : baseMsg

  return { unknownTargets, hint }
}

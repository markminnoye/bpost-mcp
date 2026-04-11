const COMPS_PREFIX = 'Comps.'

/**
 * Maps a flat CSV row into the BPost Item shape.
 *
 * Supports:
 * - Direct field mapping: `"Taal": "lang"` → `{ lang: "nl" }`
 * - Comps dot-notation: `"Naam": "Comps.1"` → aggregated into `{ Comps: { Comp: [{ code: "1", value: "..." }] } }`
 * - Auto-generated seq from rowIndex (1-based) unless explicitly mapped
 */
export function applyMapping(
  raw: Record<string, unknown>,
  mapping: Record<string, string>,
  rowIndex: number,
): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  const comps: Array<{ code: string; value: string }> = []

  for (const [sourceCol, target] of Object.entries(mapping)) {
    const value = raw[sourceCol]

    if (target.startsWith(COMPS_PREFIX)) {
      const code = target.slice(COMPS_PREFIX.length)
      // Skip empty/undefined values — common for optional fields like "Bus"
      if (value !== undefined && value !== null && value !== '') {
        comps.push({ code, value: String(value) })
      }
    } else {
      mapped[target] = value
    }
  }

  if (comps.length > 0) {
    // Sort by numeric code for deterministic output
    comps.sort((a, b) => Number(a.code) - Number(b.code))
    mapped.Comps = { Comp: comps }
  }

  // Auto-generate seq if not explicitly mapped
  if (!('seq' in mapped)) {
    mapped.seq = rowIndex
  }

  return mapped
}

// src/core/masspost/presets/contrapunt-export.ts
import type { ColumnMapping } from '../mapping'

/** Preset id for `suggestColumnMapping`. */
export const CONTRAPUNT_EXPORT_PRESET_ID = 'contrapunt-export' as const

/**
 * Column titles from Contrapunt's CRM export (Blad1 of testadressen.xlsx),
 * joined into unstructured Comp 90 / 92 / 93. Comp 91 is unused.
 */
export const CONTRAPUNT_EXPORT_COLUMN_MAPPING: ColumnMapping = {
  name: ['Roepnaam', 'Familienaam'],
  streetHouseBox: [
    'Correspondentieadres - Straat (Key)',
    'Correspondentieadres - Huisnummer (Key)',
    'Correspondentieadres - aanv. huisnr. (Key)',
  ],
  postcodeCity: [
    'Correspondentieadres - Postcode (Key)',
    'Correspondentieadres - Plaats (Key)',
  ],
}

/** Country column of the same export. Optional: older exports do not have it. */
export const CONTRAPUNT_EXPORT_COUNTRY_COLUMN = 'Correspondentieadres - Land (Tekst)'

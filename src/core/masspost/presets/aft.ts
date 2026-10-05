// src/core/masspost/presets/aft.ts
import type { AddressField } from '../mapping'

/** Preset id for `suggestColumnMapping`: the column layout of bpost's Address File Tool. */
export const AFT_PRESET_ID = 'aft' as const

/**
 * Column titles of the Address File Tool (AFT) template that feed our blocks. bpost uses two
 * spellings: the template that Contrapunt uploads (`docs/samples/contrapunt/testadressen-200-aft.xls`,
 * e.g. `UNSTRUCTURED_NAME`) and the guide (`address-file-tool.md`, e.g. `NAME_UNSTRUCTURED`).
 * The structured columns (FIRST_NAME, ADDRESS_LINE_1, …) are left out: they hold the same address
 * in another form, and bpost forbids mixing structured and unstructured within one group.
 * For the country, the name comes first; the two-letter code only when there is no name column.
 */
export const AFT_COLUMNS: Readonly<Record<AddressField, readonly string[]>> = {
  name: ['UNSTRUCTURED_NAME', 'NAME_UNSTRUCTURED'],
  companyDepartment: ['UNSTRUCTURED_COMPANY_DEPARTMENT', 'COMPANY_DEPARTMENT_BUILDING_UNSTRUCTURED'],
  streetHouseBox: ['UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX', 'STREET_HOUSE_BUILDING_UNSTRUCTURED'],
  postcodeCity: ['UNSTRUCTURED_POST_CODE_CITY', 'POSTCODE_CITY_UNSTRUCTURED'],
  country: ['COUNTRY_NAME', 'COUNTRYNAME', 'ISO_COUNTRY_CODE', 'COUNTRYISOCODE'],
}

/** Titles every AFT file has, next to the unstructured name, street and postcode columns. */
export const AFT_MARKER_COLUMNS: readonly string[] = ['SEQ', 'PRIORITY']

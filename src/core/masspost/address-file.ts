// src/core/masspost/address-file.ts
// Which files the address-list reader takes, by name. Kept apart from excel.ts so a file picker can
// check a name without loading SheetJS.

/**
 * File extensions of the address lists we read: Excel (.xlsx, with macros .xlsm, and 97-2003 .xls)
 * and OpenDocument (.ods, LibreOffice). CSV is not among them yet (Q-014).
 */
export const ADDRESS_FILE_EXTENSIONS = ['.xlsx', '.xlsm', '.xls', '.ods'] as const

const EXTENSION = /\.(xlsx|xlsm|xls|ods)$/i

/**
 * Whether a file name has one of the {@link ADDRESS_FILE_EXTENSIONS}.
 * @param fileName The name of the chosen file.
 * @returns `true` for e.g. `adressen.xlsx` or `Adressen.ODS`.
 * @example
 * isAddressFileName('leden.ods') // true
 */
export function isAddressFileName(fileName: string): boolean {
  return EXTENSION.test(fileName)
}

/**
 * The file name without its address-list extension, e.g. for a title or an export name.
 * @param fileName The name of the chosen file.
 * @returns The name without `.xlsx`, `.xlsm`, `.xls` or `.ods`; other names unchanged.
 * @example
 * addressFileBaseName('Nieuwsbrief december.xlsm') // 'Nieuwsbrief december'
 */
export function addressFileBaseName(fileName: string): string {
  return fileName.replace(EXTENSION, '')
}

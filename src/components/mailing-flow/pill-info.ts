import { HARD_LIMIT, MIN_ADDRESSES, SOFT_LIMIT } from './FileDrop'
import { formatCount } from './columns'

/**
 * Text of the pill for addresses abroad: one definition for the step bar and the list, so both mean
 * the same.
 * @param count Addresses outside Belgium (more than 0).
 * @returns The number as shown, and the explanation.
 */
export function foreignInfo(count: number): { text: string; tip: string } {
  return {
    text: formatCount(count),
    tip: `${formatCount(count)} ${count === 1 ? 'adres' : 'adressen'} in het buitenland: kijk het land na`,
  }
}

/**
 * Text of the pill for excluded rows: one definition for the step bar and the list.
 * @param count Rows left out of the mailing (more than 0).
 * @returns The number as shown, and the explanation.
 */
export function excludedInfo(count: number): { text: string; tip: string } {
  return {
    text: formatCount(count),
    tip: `${formatCount(count)} ${count === 1 ? 'rij' : 'rijen'} uitgesloten: gaat niet mee in de mailing`,
  }
}

/**
 * Text of the envelope pill: the addresses that go to bpost (every row minus the excluded ones).
 * One definition for the step bar and the list. Orange for a large list or fewer than the minimum.
 * @param input Rows in the file, rows left out, and the file name when it is known.
 * @returns The number as shown, the explanation, and whether the pill is orange.
 */
export function addressesInfo(input: { rowCount: number; excludedRows: number; fileName?: string }): {
  text: string
  tip: string
  warn: boolean
} {
  const { rowCount, excludedRows, fileName } = input
  const included = rowCount - excludedRows
  const large = rowCount > SOFT_LIMIT
  const few = included < MIN_ADDRESSES
  const inFile = fileName ? ` in ${fileName}` : ''
  const what =
    excludedRows > 0
      ? `${formatCount(included)} van de ${formatCount(rowCount)} adressen${inFile} gaan mee (${formatCount(excludedRows)} uitgesloten)`
      : `${formatCount(rowCount)} adressen${inFile}`
  return {
    text: formatCount(included),
    tip: large
      ? `Grote lijst: ${what}. Meestal tot ${formatCount(SOFT_LIMIT)}; we lezen er maximaal ${formatCount(HARD_LIMIT)} in.`
      : few
        ? `${what}: minder dan de ${MIN_ADDRESSES} die bpost per mailing vraagt`
        : what,
    warn: large || few,
  }
}

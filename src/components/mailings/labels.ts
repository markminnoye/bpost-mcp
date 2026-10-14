import type { MailingStatus, MailingSummary } from '@/core/masspost/store/mailing'

const LABELS: Record<MailingStatus, string> = {
  uploaded: 'Opgeladen · kolommen koppelen',
  mapped: 'Kolommen gekoppeld',
  format: 'Formaatvalidatie',
  checked: 'Gecontroleerd door bpost',
  submitted: 'Ingediend',
  overdue: 'Ingediend · afgiftedatum voorbij, al afgegeven?',
  done: 'Afgerond',
  withdrawn: 'Ingetrokken',
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/**
 * Filters the list on code, title and customer.
 * @param items The rows.
 * @param query What the user typed.
 * @returns The matching rows; all rows for an empty query.
 */
export function filterMailings(items: readonly MailingSummary[], query: string): MailingSummary[] {
  const q = fold(query.trim())
  if (!q) return [...items]
  return items.filter((m) => [m.code, m.title, m.customer].some((v) => fold(v).includes(q)))
}

/**
 * The status in words, for the hover tip and screen readers.
 * @param m The row.
 * @returns E.g. "Kolommen gekoppeld".
 */
export function statusLabel(m: MailingSummary): string {
  if (m.waiting) return 'Wachten op e-MassPost'
  return m.status === 'format' && m.formatIssuesOpen === 0
    ? 'Formaatvalidatie · in orde, klaar voor adrescontrole'
    : LABELS[m.status]
}

/**
 * Grade of an ARR (design 13/10, decision 20): under 96 % you cannot submit, from 96 % you can, and
 * from 98 % comes the extra discount for data quality. Status icon and bars: yellow, green, green;
 * the ARR pill: an orange dot, a green dot, a gold star.
 * @param arr Percentage.
 * @returns `low` under 96, `ok` from 96, `bonus` from 98.
 */
export function arrTone(arr: number): 'low' | 'ok' | 'bonus' {
  return arr < 96 ? 'low' : arr < 98 ? 'ok' : 'bonus'
}

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const MONTHS_LONG = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]

/**
 * A delivery date in the list, e.g. "4 okt".
 * @param date `YYYY-MM-DD`.
 * @returns Day and short month.
 */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`
}

/**
 * A delivery date in a hover tip, e.g. "4 oktober 2026".
 * @param date `YYYY-MM-DD`.
 * @returns Day, month and year.
 */
export function longDate(date: string): string {
  const [y, m, d] = date.split('-')
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1]} ${y}`
}

/**
 * A percentage with one decimal and a comma, e.g. "97,2 %".
 * @param value The percentage.
 * @returns The text.
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')} %`
}

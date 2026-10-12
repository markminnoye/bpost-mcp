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
 * @returns E.g. "Formaatvalidatie · 26 open".
 */
export function statusLabel(m: MailingSummary): string {
  if (m.status !== 'format' || m.formatIssuesOpen === null) return LABELS[m.status]
  return m.formatIssuesOpen === 0
    ? 'Formaatvalidatie · in orde, klaar voor adrescontrole'
    : `Formaatvalidatie · ${m.formatIssuesOpen} open`
}

/**
 * Colour of the ARR dot (decision 21 of 02/10).
 * @param arr Percentage.
 * @returns red below 96, orange from 96 to 98, green from 98.
 */
export function arrTone(arr: number): 'red' | 'orange' | 'green' {
  return arr < 96 ? 'red' : arr < 98 ? 'orange' : 'green'
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

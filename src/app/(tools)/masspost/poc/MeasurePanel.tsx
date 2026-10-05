'use client'

import { useState } from 'react'
import { formatCount } from './columns'
import styles from './poc.module.css'

/** Timings of one run through the POC, for the scale test (25.000 to 150.000 addresses). */
export interface Measurement {
  source: 'Excel-bestand' | 'Voorbeeldlijst'
  fileName: string
  fileBytes?: number
  rowCount: number
  columnCount: number
  /** `File.arrayBuffer()` */
  readFileMs?: number
  /** `parseExcelAddresses` (SheetJS, main thread) */
  parseMs?: number
  /** `findFormatIssues` */
  checkMs?: number
  issueCount?: number
  /** From the end of the check until the format step is on screen. */
  renderMs?: number
  /** `performance.memory.usedJSHeapSize` after reading (Chrome only). */
  heapAfterParseMb?: number
  heapAfterCheckMb?: number
  userAgent: string
  measuredAt: string
}

/** Used JS heap in MB, or `undefined` outside Chrome. */
export function usedHeapMb(): number | undefined {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  return memory ? Math.round(memory.usedJSHeapSize / 1048576) : undefined
}

function ms(value?: number) {
  return value === undefined ? '–' : `${formatCount(Math.round(value))} ms`
}

function mb(value?: number) {
  return value === undefined ? 'n.v.t.' : `${formatCount(value)} MB`
}

/** Collapsible "Meting (POC)" with a button that copies the numbers as JSON. */
export function MeasurePanel({ measurement }: { measurement: Measurement | null }) {
  const [copied, setCopied] = useState(false)
  if (!measurement) return null
  const m = measurement
  const rows: [string, string][] = [
    ['Bron', `${m.source}: ${m.fileName}`],
    ['Bestandsgrootte', m.fileBytes === undefined ? '–' : `${formatCount(Math.round(m.fileBytes / 1024))} KB`],
    ['Adressen · kolommen', `${formatCount(m.rowCount)} · ${m.columnCount}`],
    ['Bestand lezen', ms(m.readFileMs)],
    ['Inlezen (SheetJS)', ms(m.parseMs)],
    ['Geheugen na inlezen', mb(m.heapAfterParseMb)],
    ['Formaatcontrole', ms(m.checkMs)],
    ['Formaatfouten', m.issueCount === undefined ? '–' : formatCount(m.issueCount)],
    ['Geheugen na controle', mb(m.heapAfterCheckMb)],
    ['Tonen', ms(m.renderMs)],
  ]

  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(m, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <details className={styles.measure}>
      <summary>Meting (POC)</summary>
      <table className={styles.measureTable}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" className={styles.b} onClick={copy}>
        {copied ? 'Gekopieerd' : 'Kopieer meting'}
      </button>
    </details>
  )
}

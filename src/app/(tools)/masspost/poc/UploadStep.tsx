'use client'

import { useRef, useState } from 'react'
import { IconFileSpreadsheet } from '@tabler/icons-react'
import { formatCount, type LoadedList } from './columns'
import { demoList } from './demo-rows'
import { usedHeapMb, type Measurement } from './MeasurePanel'
import { Spinner } from './StatusIcons'
import styles from './poc.module.css'

/** bpost asks at least this many addresses per mailing (confirmed by Contrapunt, 28/09/2026). */
export const MIN_ADDRESSES = 500
/** Above this many addresses the POC warns, but still reads the list (to measure). */
export const SOFT_LIMIT = 25_000
/** Above this many addresses the POC stops. */
export const HARD_LIMIT = 150_000

/** Lets the browser paint (the waiting wheel) before the main thread gets busy. A hidden tab
 *  never fires animation frames, so a timer takes over there. */
export function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    const fallback = setTimeout(resolve, 100)
    requestAnimationFrame(() => {
      clearTimeout(fallback)
      setTimeout(resolve, 0)
    })
  })
}

function friendlyError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  // ExcelParseError messages are already plain Flemish, except the technical "Kon … niet lezen: …".
  if (err instanceof Error && err.name === 'ExcelParseError' && !message.startsWith('Kon het Excel-bestand')) {
    return message
  }
  return 'We konden dit bestand niet lezen. Is het een Excel-bestand (.xlsx of .xls) zonder wachtwoord?'
}

/** Step 1: choose or drop an .xlsx or .xls file. It is read in the browser; nothing is uploaded. */
export function UploadStep({
  onLoaded,
}: {
  onLoaded: (list: LoadedList, measurement: Measurement, fileBytes?: ArrayBuffer) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState<{ fileName: string; large: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function read(file: File) {
    setError(null)
    if (!/\.xlsx?$/i.test(file.name)) {
      setError('Dit is geen Excel-bestand (.xlsx of .xls). Een .csv-bestand kan deze proefversie nog niet lezen.')
      return
    }
    setBusy({ fileName: file.name, large: file.size > 1_500_000 })
    await nextPaint()
    try {
      const { parseExcelAddresses } = await import('@/core/masspost/excel')
      const t0 = performance.now()
      const buffer = await file.arrayBuffer()
      const t1 = performance.now()
      const parsed = await parseExcelAddresses(buffer)
      const t2 = performance.now()
      if (parsed.rows.length === 0) {
        setError('Je lijst bevat geen adressen: enkel een rij met kolomtitels.')
        return
      }
      if (parsed.rows.length > HARD_LIMIT) {
        setError(
          `Je lijst heeft ${formatCount(parsed.rows.length)} adressen. Deze proefversie leest er maximaal ${formatCount(HARD_LIMIT)} in.`,
        )
        return
      }
      onLoaded(
        { fileName: file.name, ...parsed },
        {
          source: 'Excel-bestand',
          fileName: file.name,
          fileBytes: file.size,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          readFileMs: t1 - t0,
          parseMs: t2 - t1,
          heapAfterParseMb: usedHeapMb(),
          userAgent: navigator.userAgent,
          measuredAt: new Date().toISOString(),
        },
        buffer,
      )
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(null)
    }
  }

  function loadDemo() {
    const list = demoList()
    onLoaded(list, {
      source: 'Voorbeeldlijst',
      fileName: list.fileName,
      rowCount: list.rows.length,
      columnCount: list.headers.length,
      userAgent: navigator.userAgent,
      measuredAt: new Date().toISOString(),
    })
  }

  return (
    <section aria-labelledby="upload-title">
      <h1 className={styles.t} id="upload-title">
        Adreslijst importeren
      </h1>
      <p className={styles.m}>
        Sleep je Excel-bestand (.xlsx of .xls) hierheen of kies het op je computer. Op de eerste rij staan de
        kolomtitels, elke volgende rij is één adres.
      </p>

      <div
        className={`${styles.drop} ${dragging ? styles.dropActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file && !busy) void read(file)
        }}
      >
        {busy ? (
          <div role="status" aria-live="polite">
            <div className={styles.busy}>
              <Spinner />
              <span>We lezen {busy.fileName} in…</span>
            </div>
            {busy.large && <p className={styles.reassure}>Grote lijst: dit kan even duren.</p>}
          </div>
        ) : (
          <>
            <IconFileSpreadsheet className={styles.dropIcon} size={32} stroke={1.5} aria-hidden="true" />
            <button type="button" className={`${styles.b} ${styles.primary}`} onClick={() => inputRef.current?.click()}>
              Kies een bestand
            </button>
            <p className={styles.reassure}>
              Je bestand blijft op je computer. We lezen het in je browser en bewaren niets.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className={styles.srOnly}
          tabIndex={-1}
          aria-label="Excel-bestand kiezen"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void read(file)
          }}
        />
      </div>

      {error && (
        <p className={styles.alert} role="alert">
          {error}
        </p>
      )}

      <div className={styles.alt}>
        <button type="button" className={styles.b} onClick={loadDemo} disabled={!!busy}>
          Probeer met een voorbeeldlijst
        </button>
      </div>
    </section>
  )
}

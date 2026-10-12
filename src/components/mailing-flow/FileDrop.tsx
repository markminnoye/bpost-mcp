'use client'

import { useRef, useState } from 'react'
import { IconFileSpreadsheet, IconFileUpload } from '@tabler/icons-react'
import { ADDRESS_FILE_EXTENSIONS, isAddressFileName } from '@/core/masspost/address-file'
import { formatCount, type LoadedList } from './columns'
import { Spinner } from './StatusIcons'
import styles from '@/components/app-shell/app.module.css'

/** bpost asks at least this many addresses per mailing (confirmed by Contrapunt, 28/09/2026). */
export const MIN_ADDRESSES = 500
/** Above this many addresses the app warns, but still reads the list. */
export const SOFT_LIMIT = 25_000
/** Above this many addresses the app stops. */
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

/**
 * The error of a file that could not be read, in plain words.
 * @param err The error.
 * @returns The message for the user.
 */
export function friendlyReadError(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  // ExcelParseError messages are already plain Flemish, except the technical "Kon … niet lezen: …".
  if (err instanceof Error && err.name === 'ExcelParseError' && !message.startsWith('Kon het Excel-bestand')) {
    return message
  }
  return 'We konden dit bestand niet lezen. Is het een Excel- of LibreOffice-bestand zonder wachtwoord?'
}

/**
 * Reads an Excel file in the browser.
 * @param file The chosen file.
 * @returns The list and the bytes, or a message for the user.
 */
export async function readAddressFile(
  file: File,
): Promise<{ ok: true; list: LoadedList; bytes: ArrayBuffer } | { ok: false; error: string }> {
  if (!isAddressFileName(file.name)) {
    return { ok: false, error: 'Dit bestand kunnen we niet lezen. Kies een Excel-bestand (.xlsx, .xlsm of .xls) of een LibreOffice-bestand (.ods).' }
  }
  try {
    const { parseExcelAddresses } = await import('@/core/masspost/excel')
    const bytes = await file.arrayBuffer()
    const parsed = await parseExcelAddresses(bytes)
    if (parsed.rows.length === 0) return { ok: false, error: 'Je lijst bevat geen adressen: enkel een rij met kolomtitels.' }
    if (parsed.rows.length > HARD_LIMIT) {
      return {
        ok: false,
        error: `Je lijst heeft ${formatCount(parsed.rows.length)} adressen. We lezen er maximaal ${formatCount(HARD_LIMIT)} in.`,
      }
    }
    return { ok: true, list: { fileName: file.name, ...parsed }, bytes }
  } catch (err) {
    return { ok: false, error: friendlyReadError(err) }
  }
}

/**
 * Step 1: the drop zone, which turns grey only while a file is dragged over it (SR-112 decision 22),
 * and after reading a card with the file name, the number of addresses and "Ander bestand kiezen".
 * @param props The read file (if any), and what to do with a new one. `locked`: only the card,
 * without "Ander bestand kiezen" (when changing the details of an existing mailing).
 */
export function FileDrop({
  file,
  locked = false,
  onFile,
}: {
  file: { name: string; addresses: number } | null
  locked?: boolean
  onFile?: (file: File) => Promise<string | null>
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function take(f: File | undefined) {
    if (!f || busy || !onFile) return
    setError(null)
    setBusy(f.name)
    await nextPaint()
    const problem = await onFile(f)
    setBusy(null)
    setError(problem)
  }

  const picker = (
    <input
      ref={input}
      type="file"
      className={styles.srOnly}
      accept={ADDRESS_FILE_EXTENSIONS.join(',')}
      aria-label="Excel-bestand kiezen"
      onChange={(e) => {
        const f = e.target.files?.[0]
        e.target.value = ''
        void take(f)
      }}
    />
  )

  return (
    <div>
      {busy ? (
        <div className={styles.filecard} role="status" aria-live="polite">
          <Spinner />
          <div>
            <b>We lezen {busy} in…</b>
            <span className={styles.muted}>Een grote lijst kan even duren.</span>
          </div>
        </div>
      ) : file ? (
        <div className={styles.filecard}>
          <IconFileSpreadsheet size={24} stroke={1.75} aria-hidden="true" />
          <div>
            <b>{file.name}</b>
            <span className={styles.muted}>{formatCount(file.addresses)} adressen</span>
          </div>
          {!locked && (
            <>
              <button type="button" className={styles.btn} onClick={() => input.current?.click()}>
                Ander bestand kiezen
              </button>
              {picker}
            </>
          )}
        </div>
      ) : (
        <label
          className={`${styles.drop} ${over ? styles.dropOver : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            void take(e.dataTransfer.files[0])
          }}
        >
          {picker}
          <IconFileUpload size={28} stroke={1.75} aria-hidden="true" />
          <b>Sleep je adreslijst hierheen</b>
          <span>Excel (.xlsx, .xlsm, .xls) of LibreOffice (.ods)</span>
          <span className={styles.btn} aria-hidden="true">
            Kies een bestand
          </span>
          <small>Het bestand blijft in je browser.</small>
        </label>
      )}
      {error && (
        <p className={styles.readerr} role="alert">
          {error}
        </p>
      )}
      {file && !busy && file.addresses < MIN_ADDRESSES && (
        <p className={styles.warnText}>
          Je lijst heeft {formatCount(file.addresses)} adressen: minder dan de {MIN_ADDRESSES} die bpost per mailing vraagt.
        </p>
      )}
      {file && !busy && file.addresses > SOFT_LIMIT && (
        <p className={styles.warnText}>Grote lijst: {formatCount(file.addresses)} adressen. Het nakijken kan wat langer duren.</p>
      )}
    </div>
  )
}

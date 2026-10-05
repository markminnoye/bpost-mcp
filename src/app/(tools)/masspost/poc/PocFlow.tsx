'use client'

import { useMemo, useRef, useState } from 'react'
import { IconSunMoon } from '@tabler/icons-react'
import { findFormatIssues, missingTargets, type FormatIssue } from '@/core/masspost/format-check'
import { suggestColumnMapping, type MappingPresetId } from '@/core/masspost/suggest-mapping'
import {
  ADDRESS_FIELDS,
  countForeign,
  initialRoles,
  moveInBlock,
  requiredBlocksHaveData,
  rolesToMapping,
  type ColumnRole,
  type LoadedList,
} from './columns'
import { FormatStep } from './FormatStep'
import { MappingStep } from './MappingStep'
import { MeasurePanel, usedHeapMb, type Measurement } from './MeasurePanel'
import { MetaPills, basePills, columnsPill, formatPills, includedPill, type Pill } from './MetaPills'
import { StepBar, type StepId, type StepStatus } from './StepBar'
import { UploadStep, nextPaint } from './UploadStep'
import styles from './poc.module.css'

/** Offers bytes to the browser as a file download. */
function download(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * POC of the first steps of a mailing: upload, map columns, format validation, and the start of
 * the address check (export for the printer). Everything runs in the browser; nothing is sent or
 * stored. Also bundled as a standalone HTML file.
 */
export function PocFlow({ docsUrl }: { docsUrl?: string }) {
  const [step, setStep] = useState<StepId>('upload')
  const [list, setList] = useState<LoadedList | null>(null)
  const [fileBytes, setFileBytes] = useState<ArrayBuffer | undefined>()
  const [preset, setPreset] = useState<MappingPresetId | undefined>()
  const [roles, setRoles] = useState<Record<string, ColumnRole>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [issues, setIssues] = useState<FormatIssue[]>([])
  const [checkRun, setCheckRun] = useState(0)
  const [checking, setChecking] = useState(false)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>()
  const [formatTotals, setFormatTotals] = useState({ open: 0, excludedRows: 0 })
  const checkedAt = useRef(0)
  const foreignCount = useMemo(
    () => (list ? countForeign(list, rolesToMapping(columnOrder, roles).mapping) : 0),
    [list, columnOrder, roles],
  )

  // Grey until a step has a status: a step behind us is done, the current one may need action.
  const mappingDone = list ? missingTargets(rolesToMapping(columnOrder, roles).mapping).length === 0 : false
  const stepStatus: Partial<Record<StepId, StepStatus>> = {
    upload: list && step !== 'upload' ? 'done' : 'none',
    mapping: step === 'format' || step === 'check' ? 'done' : step === 'mapping' ? (mappingDone ? 'none' : 'action') : 'none',
    format: step === 'check' ? 'done' : step === 'format' ? (formatTotals.open > 0 ? 'action' : 'done') : 'none',
    check: 'none',
  }

  // The pills sit in the top bar, next to the steps (decision 46); each step adds its own.
  const pills: Pill[] = []
  if (list && step !== 'upload') {
    pills.push(...basePills(list.fileName, preset, list.rows.length, foreignCount))
    if (step === 'mapping') {
      const mapped = list.headers.filter((header) => (ADDRESS_FIELDS as readonly string[]).includes(roles[header])).length
      pills.push(columnsPill(mapped, list.headers.length))
    }
    if (step === 'check') pills.push(includedPill(list.rows.length - formatTotals.excludedRows))
    if (step === 'format' || step === 'check') pills.push(...formatPills(formatTotals.open, formatTotals.excludedRows))
  }

  async function check(target: LoadedList, chosenRoles: Record<string, ColumnRole>, order: string[]) {
    setChecking(true)
    await nextPaint()
    const { mapping, contextColumns } = rolesToMapping(order, chosenRoles)
    const t0 = performance.now()
    const found = findFormatIssues(target.rows, mapping, { rowNumbers: target.rowNumbers, contextColumns })
    const t1 = performance.now()
    setMeasurement((m) =>
      m && { ...m, checkMs: t1 - t0, issueCount: found.length, heapAfterCheckMb: usedHeapMb(), renderMs: undefined },
    )
    checkedAt.current = performance.now()
    setFormatTotals({ open: found.length, excludedRows: 0 })
    setIssues(found)
    setCheckRun((n) => n + 1)
    setChecking(false)
    // Without format errors the mailing goes straight on (web-flow design, step 3).
    setStep(found.length === 0 ? 'check' : 'format')
  }

  async function onLoaded(loaded: LoadedList, m: Measurement, bytes?: ArrayBuffer) {
    const suggestion = suggestColumnMapping({ headers: loaded.headers })
    const chosen = initialRoles(loaded.headers, suggestion)
    const order = [...loaded.headers]
    setList(loaded)
    setFileBytes(bytes)
    setPreset(suggestion.preset)
    setRoles(chosen)
    setColumnOrder(order)
    setMeasurement(m)
    // A known layout skips the mapping step, as long as the address columns are really filled in.
    const { mapping } = rolesToMapping(order, chosen)
    if (suggestion.preset && missingTargets(mapping).length === 0 && requiredBlocksHaveData(loaded, mapping)) {
      await check(loaded, chosen, order)
      return
    }
    setStep('mapping')
  }

  async function exportForPrinter(excludedRowNumbers: number[]) {
    if (!list) return
    const [{ buildPrinterExport }, { parseExcelAddresses }] = await Promise.all([
      import('@/core/masspost/printer-export'),
      import('@/core/masspost/excel'),
    ])
    const parsed = fileBytes ? await parseExcelAddresses(fileBytes) : list
    const bytes = buildPrinterExport({ source: fileBytes, parsed, excludedRowNumbers: new Set(excludedRowNumbers) })
    const base = list.fileName.replace(/\.xlsx?$/i, '')
    download(bytes, `${base} - voor de drukker.xlsx`)
  }

  function toggleTheme() {
    const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(dark ? 'light' : 'dark')
  }

  const showFormat = (step === 'format' || step === 'check') && list

  return (
    <div className={styles.root} data-theme={theme}>
      <main className={styles.main}>
        <div className={styles.top}>
          <StepBar current={step} status={stepStatus} onGo={setStep} />
          <div className={styles.topRight}>
            {pills.length > 0 && <MetaPills pills={pills} />}
            <button
              type="button"
              className={`${styles.ib} ${styles.tipBelow}`}
              data-tip="Wissel tussen licht en donker"
              aria-label="Wissel tussen licht en donker"
              onClick={toggleTheme}
            >
              <IconSunMoon size={15} stroke={1.75} aria-hidden="true" />
            </button>
          </div>
        </div>

        {step === 'upload' && <UploadStep onLoaded={onLoaded} />}
        {step === 'mapping' && list && (
          <MappingStep
            list={list}
            docsUrl={docsUrl}
            roles={roles}
            columnOrder={columnOrder}
            checking={checking}
            onRoleChange={(header, role) => setRoles((r) => ({ ...r, [header]: role }))}
            onMove={(column, direction) => setColumnOrder((order) => moveInBlock(order, roles, column, direction))}
            onNext={() => check(list, roles, columnOrder)}
          />
        )}
        {showFormat && (
          <FormatStep
            key={checkRun}
            issues={issues}
            rowCount={list.rows.length}
            onTotals={setFormatTotals}
            done={step === 'check'}
            onDone={(done) => setStep(done ? 'check' : 'format')}
            onExport={exportForPrinter}
            docsUrl={docsUrl}
            onRendered={() =>
              setMeasurement((m) => m && { ...m, renderMs: performance.now() - checkedAt.current })
            }
          />
        )}

        <MeasurePanel measurement={measurement} />
      </main>
    </div>
  )
}

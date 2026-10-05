'use client'

import { useMemo, useRef, useState } from 'react'
import { IconSunMoon } from '@tabler/icons-react'
import { REQUIRED_FIELDS, findFormatIssues, missingTargets, type FormatIssue } from '@/core/masspost/format-check'
import type { AddressField } from '@/core/masspost/mapping'
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
import { FormatStep, type SaveChoices, type SaveTarget } from './FormatStep'
import { MappingStep } from './MappingStep'
import { MeasurePanel, usedHeapMb, type Measurement } from './MeasurePanel'
import { MetaPills, listPills, type Pill } from './MetaPills'
import { StepBar, type StepId, type StepStatus } from './StepBar'
import { UploadStep, nextPaint } from './UploadStep'
import { saveFile } from './save-file'
import styles from './poc.module.css'

/** Identifies a column choice: the order of the columns and the role of each. */
function choiceKey(order: string[], roles: Record<string, ColumnRole>): string {
  return JSON.stringify([order, order.map((column) => roles[column])])
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
  // The column choice the format check ran on. The check and its corrections stay valid until
  // another file is loaded or the mapping changes (changing it back makes them valid again).
  const [checkedFor, setCheckedFor] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>()
  const [formatTotals, setFormatTotals] = useState({ open: 0, excludedRows: 0 })
  const checkedAt = useRef(0)
  const foreignCount = useMemo(
    () => (list ? countForeign(list, rolesToMapping(columnOrder, roles).mapping) : 0),
    [list, columnOrder, roles],
  )

  // Grey until a step has a status: yellow when it needs action, green when it is in order.
  const missing = list ? missingTargets(rolesToMapping(columnOrder, roles).mapping).length : REQUIRED_FIELDS.length
  const mappingDone = list !== null && missing === 0
  const checked = list !== null && checkedFor === choiceKey(columnOrder, roles)
  const stepStatus: Partial<Record<StepId, StepStatus>> = {
    upload: list ? 'done' : 'none',
    mapping: !list ? 'none' : !mappingDone ? 'action' : checked ? 'done' : 'none',
    format: checked ? (formatTotals.open > 0 ? 'action' : 'done') : 'none',
    check: 'none',
  }
  // How far each step is: the required blocks with a column, and the format errors handled.
  const progress: Partial<Record<StepId, number>> = {
    upload: list ? 1 : 0,
    mapping: (REQUIRED_FIELDS.length - missing) / REQUIRED_FIELDS.length,
    format: checked ? (issues.length ? (issues.length - formatTotals.open) / issues.length : 1) : 0,
    check: 0,
  }
  // Every step with a valid result stays reachable, also forwards.
  const reachable: Partial<Record<StepId, boolean>> = {
    upload: true,
    mapping: list !== null,
    format: checked,
    check: checked && formatTotals.open === 0,
  }

  // The pills sit in the top bar, next to the steps (decision 46); each step adds its own.
  const formatShown = step === 'format' || step === 'check'
  const pills: Pill[] =
    list && step !== 'upload'
      ? listPills({
          fileName: list.fileName,
          preset,
          rowCount: list.rows.length,
          foreignCount,
          columns:
            step === 'mapping'
              ? {
                  mapped: list.headers.filter((header) => (ADDRESS_FIELDS as readonly string[]).includes(roles[header]))
                    .length,
                  total: list.headers.length,
                  complete: mappingDone,
                }
              : undefined,
          format: formatShown ? { open: formatTotals.open } : undefined,
          excludedRows: formatShown ? formatTotals.excludedRows : 0,
        })
      : []

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
    setCheckedFor(choiceKey(order, chosenRoles))
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
    setCheckedFor(null)
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

  /** Step 4: saves the file for bpost's Address File Tool or the one for the printer. */
  async function save(target: SaveTarget, { excludedRowNumbers, corrections }: SaveChoices) {
    if (!list) return
    const base = list.fileName.replace(/\.xlsx?$/i, '')
    if (target === 'aft') {
      const { buildAftExport } = await import('@/core/masspost/aft-export')
      const byRow = new Map<number, Partial<Record<AddressField, string>>>()
      for (const [key, value] of Object.entries(corrections)) {
        const [seq, field] = key.split(':')
        byRow.set(Number(seq), { ...byRow.get(Number(seq)), [field]: value })
      }
      const bytes = buildAftExport({
        rows: list.rows,
        rowNumbers: list.rowNumbers,
        mapping: rolesToMapping(columnOrder, roles).mapping,
        corrections: byRow,
        excludedRowNumbers: new Set(excludedRowNumbers),
      })
      saveFile(bytes, { name: `${base} - voor bpost (AFT).xls`, mime: 'application/vnd.ms-excel' })
      return
    }
    const [{ buildPrinterExport }, { parseExcelAddresses }] = await Promise.all([
      import('@/core/masspost/printer-export'),
      import('@/core/masspost/excel'),
    ])
    const parsed = fileBytes ? await parseExcelAddresses(fileBytes) : list
    const bytes = buildPrinterExport({ source: fileBytes, parsed, excludedRowNumbers: new Set(excludedRowNumbers) })
    saveFile(bytes, {
      name: `${base} - voor de drukker.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  function toggleTheme() {
    const dark = theme ? theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(dark ? 'light' : 'dark')
  }

  // Format step and step 4 share one component. It stays mounted on the other steps (hidden), so
  // going back to Koppelen keeps the corrections.
  const onFormatStep = step === 'format' || step === 'check'

  return (
    <div className={styles.root} data-theme={theme}>
      <main className={styles.main}>
        <div className={styles.top}>
          <StepBar current={step} status={stepStatus} progress={progress} reachable={reachable} onGo={setStep} />
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
            onNext={() => (checked ? setStep(issues.length === 0 ? 'check' : 'format') : check(list, roles, columnOrder))}
          />
        )}
        {list && checkedFor !== null && (
          <div hidden={!onFormatStep}>
            <FormatStep
              key={checkRun}
              issues={issues}
              rowCount={list.rows.length}
              onTotals={setFormatTotals}
              done={step === 'check'}
              onDone={(done) => setStep(done ? 'check' : 'format')}
              onSave={save}
              docsUrl={docsUrl}
              active={step === 'format'}
              onRendered={() =>
                setMeasurement((m) => m && { ...m, renderMs: performance.now() - checkedAt.current })
              }
            />
          </div>
        )}

        <MeasurePanel measurement={measurement} />
      </main>
    </div>
  )
}

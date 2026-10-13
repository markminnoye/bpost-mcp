'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { REQUIRED_FIELDS, findFormatIssues, missingTargets, type FormatIssue } from '@/core/masspost/format-check'
import type { AddressField } from '@/core/masspost/mapping'
import { suggestColumnMapping } from '@/core/masspost/suggest-mapping'
import { summarize, type Mailing } from '@/core/masspost/store/mailing'
import {
  ADDRESS_FIELDS,
  columnExamples,
  columnFillCounts,
  countForeign,
  initialRoles,
  moveInBlock,
  requiredBlocksHaveData,
  rolesFromSuggestion,
  rolesToMapping,
  type AiSuggestion,
  type ColumnRole,
  type LoadedList,
} from './columns'
import { requestAiSuggestion, suggestionRequestBody, type AiSuggestionResult } from './ai-suggestion'
import { nextPaint } from './FileDrop'
import { FormatStep, type SaveChoices, type SaveTarget } from './FormatStep'
import { DetailsStep } from './DetailsStep'
import { MappingStep } from './MappingStep'
import { MetaPills, listPills, type Pill } from './MetaPills'
import { formatStateFromMailing, resumeStep } from './resume'
import { StepBar, type StepId, type StepStatus } from './StepBar'
import { StatusIcon } from '@/components/mailings/StatusIcon'
import { PageHeader } from '@/components/app-shell/AppShell'
import { STORE_FULL_MESSAGE } from '@/components/mailings/MailingStoreProvider'
import type { MailingSaver } from './useMailingSaver'
import { exportBaseName, printerFile } from './exports'
import { saveFile } from './save-file'
import styles from './mailing-flow.module.css'

/** Identifies a column choice: the order of the columns and the role of each. */
function choiceKey(order: string[], roles: Record<string, ColumnRole>): string {
  return JSON.stringify([order, order.map((column) => roles[column])])
}

/** State of the AI proposal switch. The proposal is kept per file; `before` is the choice to return to. */
interface AiState {
  on: boolean
  busy: boolean
  suggestion?: AiSuggestion
  before?: { roles: Record<string, ColumnRole>; order: string[] }
  error?: Exclude<AiSuggestionResult, { ok: true }>['reason']
}

/** The column choice to start from: the stored mapping, or the proposal for these column titles. */
function startChoice(mailing: Mailing, list: LoadedList) {
  const suggestion = suggestColumnMapping({ headers: list.headers })
  if (mailing.mapping) {
    return { preset: suggestion.preset, roles: mailing.mapping.roles as Record<string, ColumnRole>, order: mailing.mapping.order }
  }
  return { preset: suggestion.preset, roles: initialRoles(list.headers, suggestion), order: [...list.headers] }
}

/**
 * The flow of a stored mailing: its details (step 1), map columns, format validation, and the start
 * of the address check (exports). Everything runs in the browser; the mailing is saved through `saver`
 * (SR-112 §5): the mapping when it is done, the format check, and details and corrections 2 s after
 * the last change (at once on a step change).
 * Only the AI proposal switch sends something: column titles and masked examples (ADR 0006).
 */
export function MailingFlow({
  mailing,
  list,
  fileBytes,
  saver,
  title,
  docsUrl,
  aiModel,
  startOnDetails = false,
  onDetailsIncomplete,
}: {
  mailing: Mailing
  list: LoadedList
  fileBytes: ArrayBuffer
  saver: MailingSaver
  /** The title of the mailing, above the step bar; the status of the step before it, the pills after. */
  title: ReactNode
  docsUrl?: string
  aiModel?: string
  /** Open on step 1 (the details) instead of the furthest valid step. */
  startOnDetails?: boolean
  /** True while step 1 misses a required field: that change cannot be saved, so leaving asks first. */
  onDetailsIncomplete?: (incomplete: boolean) => void
}) {
  const [start] = useState(() => startChoice(mailing, list))
  const [step, setStep] = useState<StepId>(() =>
    startOnDetails ? 'upload' : mailing.mapping ? resumeStep(mailing) : 'mapping',
  )
  // Required fields still empty in step 1; the other steps wait until they are filled in.
  const [detailsMissing, setDetailsMissing] = useState(0)
  const [roles, setRoles] = useState<Record<string, ColumnRole>>(start.roles)
  const [columnOrder, setColumnOrder] = useState<string[]>(start.order)
  const [issues, setIssues] = useState<FormatIssue[]>([])
  const [checkRun, setCheckRun] = useState(0)
  // The column choice the format check ran on. The check and its corrections stay valid until the
  // mapping changes (changing it back makes them valid again).
  const [checkedFor, setCheckedFor] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [formatTotals, setFormatTotals] = useState({ open: 0, excludedRows: 0 })
  // The stored corrections, for the first check only; a new check after a mapping change starts empty.
  const [initialFormat, setInitialFormat] = useState(() => (mailing.mapping ? formatStateFromMailing(mailing) : undefined))
  const [ai, setAi] = useState<AiState>({ on: false, busy: false })
  const lastSavedOpen = useRef(mailing.counts.formatIssuesOpen)
  const aiRoles = useMemo(
    () => (ai.suggestion ? rolesFromSuggestion(list.headers, ai.suggestion).roles : undefined),
    [list, ai.suggestion],
  )
  const foreignCount = useMemo(() => countForeign(list, rolesToMapping(columnOrder, roles).mapping), [list, columnOrder, roles])

  // Grey until a step has a status: yellow when it needs action, green when it is in order.
  const missing = missingTargets(rolesToMapping(columnOrder, roles).mapping).length
  const mappingDone = missing === 0
  const checked = checkedFor === choiceKey(columnOrder, roles)
  const stepStatus: Partial<Record<StepId, StepStatus>> = {
    upload: detailsMissing > 0 ? 'action' : 'done',
    mapping: mappingDone ? 'done' : 'action',
    format: checked ? (formatTotals.open > 0 ? 'action' : 'done') : 'none',
    check: 'none',
  }
  // How far each step is: the required blocks with a column, and the format errors handled.
  const progress: Partial<Record<StepId, number>> = {
    upload: (4 - detailsMissing) / 4,
    mapping: (REQUIRED_FIELDS.length - missing) / REQUIRED_FIELDS.length,
    format: checked ? (issues.length ? (issues.length - formatTotals.open) / issues.length : 1) : 0,
    check: 0,
  }
  // Every step with a valid result stays reachable, also forwards; not while step 1 misses something.
  const detailsOk = detailsMissing === 0
  const reachable: Partial<Record<StepId, boolean>> = {
    upload: true,
    mapping: detailsOk,
    format: detailsOk && checked,
    check: detailsOk && checked && formatTotals.open === 0,
  }

  /** To another step: what waits (e.g. changed details) is saved first. */
  function go(target: StepId) {
    void saver.flush()
    setStep(target)
  }

  const reportIncomplete = useRef(onDetailsIncomplete)
  reportIncomplete.current = onDetailsIncomplete
  useEffect(() => {
    reportIncomplete.current?.(detailsMissing > 0)
  }, [detailsMissing])

  // The pills sit in the top bar, next to the steps (decision 46); each step adds its own.
  const formatShown = step === 'format' || step === 'check'
  const pills: Pill[] = listPills({
    fileName: list.fileName,
    preset: start.preset,
    rowCount: list.rows.length,
    foreignCount,
    columns:
      step === 'mapping'
        ? {
            mapped: list.headers.filter((header) => (ADDRESS_FIELDS as readonly string[]).includes(roles[header])).length,
            total: list.headers.length,
            complete: mappingDone,
          }
        : undefined,
    format: formatShown ? { open: formatTotals.open } : undefined,
    excludedRows: formatShown ? formatTotals.excludedRows : 0,
  })

  /**
   * Runs the format check. `resume`: the stored mapping and corrections stay (opening a mailing);
   * otherwise the check is new and the stored corrections are cleared.
   */
  const check = useCallback(
    async (chosenRoles: Record<string, ColumnRole>, order: string[], resume: boolean) => {
      setChecking(true)
      await nextPaint()
      const { mapping, contextColumns } = rolesToMapping(order, chosenRoles)
      const found = findFormatIssues(list.rows, mapping, { rowNumbers: list.rowNumbers, contextColumns })
      setCheckedFor(choiceKey(order, chosenRoles))
      setIssues(found)
      setCheckRun((n) => n + 1)
      setChecking(false)
      if (resume) {
        setFormatTotals({ open: found.length, excludedRows: 0 })
        // Opened on step 1: the user moves on from there; otherwise the furthest valid step.
        if (!startOnDetails) setStep(resumeStep(mailing))
        return
      }
      setInitialFormat(undefined)
      setFormatTotals({ open: found.length, excludedRows: 0 })
      lastSavedOpen.current = found.length
      void saver.save(
        { status: 'format', counts: { addresses: list.rows.length, formatIssuesOpen: found.length }, corrections: {}, excludedRows: [] },
        'format-checked',
      )
      // Without format errors the mailing goes straight on (web-flow design, step 3).
      setStep(found.length === 0 ? 'check' : 'format')
    },
    [list, mailing, saver, startOnDetails],
  )

  // Opening a mailing: a stored mapping gets its format check again; a known layout skips the
  // mapping step, as long as the address columns are really filled in.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    if (mailing.mapping) {
      void check(start.roles, start.order, true)
      return
    }
    const { mapping } = rolesToMapping(start.order, start.roles)
    if (start.preset && missingTargets(mapping).length === 0 && requiredBlocksHaveData(list, mapping)) {
      void saver.save({ mapping: { order: start.order, roles: start.roles }, status: 'mapped' }, 'mapped').then(() =>
        check(start.roles, start.order, false),
      )
    }
  }, [check, list, mailing.mapping, saver, start])

  async function onMappingNext() {
    if (checking) return
    if (checked) {
      setStep(issues.length === 0 ? 'check' : 'format')
      return
    }
    // Busy from the click on, also while the mapping is saved: a second click cannot start it twice.
    setChecking(true)
    await saver.save({ mapping: { order: columnOrder, roles }, status: 'mapped' }, 'mapped')
    await check(roles, columnOrder, false)
  }

  function onTotals(totals: { open: number; excludedRows: number }) {
    setFormatTotals(totals)
    if (totals.open !== lastSavedOpen.current) {
      lastSavedOpen.current = totals.open
      saver.saveSoon({ counts: { addresses: list.rows.length, formatIssuesOpen: totals.open } }, 'format-edited')
    }
  }

  /** Step 4: saves the file for bpost's Address File Tool or the one for the printer. */
  async function save(target: SaveTarget, { excludedRowNumbers, corrections }: SaveChoices) {
    const base = exportBaseName(list.fileName)
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
    // The same file as "Opslaan voor de drukker" in the list.
    const bytes = await printerFile(fileBytes, excludedRowNumbers)
    saveFile(bytes, {
      name: `${base} - voor de drukker.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  /** On: take over the AI proposal (asked once per file). Off: back to the choice from before. */
  async function toggleAi(on: boolean) {
    if (ai.busy) return
    if (!on) {
      if (ai.before) {
        setRoles(ai.before.roles)
        setColumnOrder(ai.before.order)
      }
      setAi((a) => ({ ...a, on: false, before: undefined, error: undefined }))
      return
    }
    const before = { roles, order: columnOrder }
    let suggestion = ai.suggestion
    if (!suggestion) {
      setAi((a) => ({ ...a, busy: true, error: undefined }))
      const result = await requestAiSuggestion(suggestionRequestBody(list, columnExamples(list), columnFillCounts(list)))
      if (!result.ok) {
        setAi((a) => ({ ...a, busy: false, on: false, error: result.reason }))
        return
      }
      suggestion = result.suggestion
    }
    const chosen = rolesFromSuggestion(list.headers, suggestion)
    setRoles(chosen.roles)
    setColumnOrder(chosen.columnOrder)
    setAi({ on: true, busy: false, suggestion, before })
  }

  // Format step and step 4 share one component. It stays mounted on the other steps (hidden), so
  // going back to Koppelen keeps the corrections.
  const onFormatStep = step === 'format' || step === 'check'

  return (
    <div className={styles.root} style={{ minHeight: 0, background: 'transparent' }}>
      <div className={styles.main} style={{ padding: 0 }}>
        <PageHeader
          // The status of the mailing as stored, the same icon as in the list: it does not follow the
          // step you look at (Mark, 13/10).
          icon={<StatusIcon mailing={summarize(saver.mailing)} size={22} />}
          title={title}
          actions={
            pills.length > 0 ? (
              <div className={styles.titlePills}>
                <MetaPills pills={pills} />
              </div>
            ) : undefined
          }
        />
        {saver.state === 'error' && (
          <p className={styles.alert} role="alert">
            {saver.full ? `Nog niet bewaard. ${STORE_FULL_MESSAGE}` : 'Nog niet bewaard.'}{' '}
            <button type="button" className={styles.b} onClick={() => void saver.retry()}>
              Opnieuw proberen
            </button>
          </p>
        )}
        {saver.state === 'conflict' && (
          <p className={styles.alert} role="alert">
            Deze mailing is intussen gewijzigd.{' '}
            <button type="button" className={styles.b} onClick={() => location.reload()}>
              Herladen
            </button>
          </p>
        )}
        <div className={styles.top}>
          <StepBar
            current={step}
            status={stepStatus}
            progress={progress}
            reachable={reachable}
            onGo={go}
          />
        </div>

        {step === 'upload' && (
          <DetailsStep
            mailing={saver.mailing}
            onChange={(change) => saver.saveSoon(change, 'details')}
            onMissing={setDetailsMissing}
            onNext={() => go('mapping')}
          />
        )}
        {step === 'mapping' && (
          <MappingStep
            list={list}
            docsUrl={docsUrl}
            roles={roles}
            columnOrder={columnOrder}
            checking={checking}
            onRoleChange={(header, role) => setRoles((r) => ({ ...r, [header]: role }))}
            onMove={(column, direction) => setColumnOrder((order) => moveInBlock(order, roles, column, direction))}
            onNext={() => void onMappingNext()}
            ai={
              aiModel
                ? { model: aiModel, on: ai.on, busy: ai.busy, roles: aiRoles, error: ai.error, onToggle: toggleAi }
                : undefined
            }
          />
        )}
        {checkedFor !== null && (
          <div hidden={!onFormatStep}>
            <FormatStep
              key={checkRun}
              issues={issues}
              rowCount={list.rows.length}
              onTotals={onTotals}
              done={step === 'check'}
              onDone={(done) => setStep(done ? 'check' : 'format')}
              onSave={save}
              docsUrl={docsUrl}
              active={step === 'format'}
              initial={initialFormat}
              onChange={(s) =>
                saver.saveSoon(
                  { corrections: s.values, excludedRows: Object.keys(s.excluded).map(Number) },
                  'format-edited',
                )
              }
            />
          </div>
        )}
        {onFormatStep && checkedFor === null && checking && (
          <p className={styles.m} role="status">
            We kijken je lijst opnieuw na…
          </p>
        )}
      </div>
    </div>
  )
}

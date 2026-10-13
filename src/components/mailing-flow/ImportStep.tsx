'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { missingDetails, nextMailingCode } from '@/core/masspost/store/mailing'
import {
  CodeTakenError,
  StoreFullError,
  StoreUnavailableError,
  type MailingListItem,
} from '@/core/masspost/store/mailing-store'
import { sha256Hex } from '@/core/masspost/store/hash'
import type { TenantDefaults } from '@/lib/tenant/settings-schema'
import { PageHeader } from '@/components/app-shell/AppShell'
import { STORE_FULL_MESSAGE, STORE_UNAVAILABLE_MESSAGE, useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { LoadedList } from './columns'
import { DetailsForm, useCustomerSuggestions } from './DetailsForm'
import { FileDrop, readAddressFile } from './FileDrop'
import { initialDraft, missingText, toDetails, withFile, type ImportDraft } from './import-draft'
import { StepBar } from './StepBar'
import { useLeaveGuard } from './useLeaveGuard'
import flow from './mailing-flow.module.css'
import styles from '@/components/app-shell/app.module.css'

/**
 * Today in the local time zone, as `YYYY-MM-DD`.
 * @returns The date.
 */
export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Step 1 Importeren of a new mailing (SR-112 §5). First only the address list, in the middle; once it
 * is read, the details appear with the title from the file name, and the list moves below them
 * (Mark, 13/10). The mailing is only created on "Verder naar koppelen". An existing mailing changes
 * its details in the flow (`DetailsStep`).
 * @param props The defaults of the organisation.
 */
export function ImportStep({ defaults }: { defaults: TenantDefaults }) {
  const { store, user } = useMailingStore()
  const router = useRouter()
  const prefix = defaults.codePrefix
  // The start values are fixed for the life of the screen.
  const [start] = useState<ImportDraft>(() => initialDraft(defaults, ''))
  const [draft, setDraft] = useState<ImportDraft>(start)
  const [codeTouched, setCodeTouched] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [loaded, setLoaded] = useState<{ list: LoadedList; bytes: ArrayBuffer; file: File } | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  // The details appear once a list was read, and stay, also when a later choice fails.
  const [revealed, setRevealed] = useState(false)
  const created = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const stay = useRef<HTMLButtonElement>(null)
  const customers = useCustomerSuggestions(() => setSaveError(STORE_UNAVAILABLE_MESSAGE))

  const addresses = loaded?.list.rows.length ?? null
  const fileCard = loaded ? { name: loaded.file.name, addresses: loaded.list.rows.length } : null

  // Codes already in use, for the proposed code.
  useEffect(() => {
    let alive = true
    store
      .list()
      .then((items) => alive && setCodes(takenCodes(items)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [store])

  const proposed = useMemo(() => nextMailingCode(prefix || 'M', new Date().getFullYear(), codes), [prefix, codes])
  const code = codeTouched ? draft.code : proposed
  const current = { ...draft, code }

  const missing = missingDetails(
    { title: current.title, code: current.code, expectedDeliveryDate: current.expectedDeliveryDate, hasFile: !!fileCard },
    today(),
  )
  const dirty = !created.current && (loaded !== null || JSON.stringify(draft) !== JSON.stringify(start))

  // Leaving with filled-in details: ask first (SR-112 §5, decision 20). Links and the back button
  // inside the app go through the dialog; reloading or closing the tab gets the browser's question.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useLeaveGuard(() => dirtyRef.current, setLeaveTo, { back: true })
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (leaveTo && dialog.current && !dialog.current.open) {
      dialog.current.showModal()
      stay.current?.focus()
    }
  }, [leaveTo])

  async function onFile(file: File): Promise<string | null> {
    const result = await readAddressFile(file)
    if (!result.ok) {
      // A failed new choice also drops the earlier list: "Verder" must not go on with a file you replaced.
      setLoaded(null)
      return result.error
    }
    setLoaded({ list: result.list, bytes: result.bytes, file })
    setDraft((d) => withFile(d, file.name, result.list.rows.length))
    if (!revealed) setRevealed(true)
    return null
  }

  // When the details appear (only then): the cursor in the first required field that is still empty.
  const draftRef = useRef(draft)
  draftRef.current = draft
  useEffect(() => {
    if (!revealed) return
    const d = draftRef.current
    const first = !d.title.trim() ? 'f-title' : !d.expectedDeliveryDate ? 'f-date' : null
    if (first) document.getElementById(first)?.focus()
  }, [revealed])

  async function onNext() {
    if (missing.length || saving || !loaded) return
    setSaving(true)
    setCodeError(null)
    setSaveError(null)
    try {
      // No check beforehand: create refuses a taken code itself, also one of an unreadable mailing.
      const sha256 = await sha256Hex(loaded.bytes)
      await store.create(
        {
          details: toDetails(current),
          source: { name: loaded.file.name, size: loaded.file.size, sha256 },
          addresses: loaded.list.rows.length,
        },
        new Blob([loaded.bytes], { type: loaded.file.type }),
        user.email,
      )
      created.current = true
      router.push(`/mailings/${encodeURIComponent(current.code)}`)
    } catch (e) {
      if (e instanceof CodeTakenError) {
        const all = await store.list().then(takenCodes)
        setCodes(all)
        setCodeError(`Deze code bestaat al. Volgende vrije: ${nextMailingCode(prefix || 'M', new Date().getFullYear(), all)}`)
      } else if (e instanceof StoreFullError) {
        setSaveError(STORE_FULL_MESSAGE)
      } else if (e instanceof StoreUnavailableError) {
        setSaveError(STORE_UNAVAILABLE_MESSAGE)
      } else {
        setSaveError('Bewaren lukte niet. Probeer het opnieuw.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={flow.root} style={{ minHeight: 0, background: 'transparent' }}>
      <div className={styles.page}>
        {/* Same layout as the other steps: the mailing on top, then the steps, then this step. */}
        <PageHeader
          title={
            <>
              {current.title.trim() ? current.title : <span className={styles.titlePlaceholder}>Nieuwe mailing</span>}{' '}
              <span className={styles.code}>{current.code}</span>
            </>
          }
        />
        <div className={flow.top}>
          <StepBar
            current="upload"
            // The same rules as the other steps (e.g. Koppelen): something to do while an item is
            // missing, in order once all is filled in; the bar fills per item (title, code, date, list).
            status={{ upload: missing.length === 0 ? 'done' : 'action' }}
            progress={{ upload: (4 - missing.length) / 4 }}
            reachable={{}}
            onGo={() => {}}
          />
        </div>
        <section aria-labelledby="import-title" style={{ marginBottom: 16 }}>
          <div className={flow.hd}>
            <div>
              <h1 className={flow.t} id="import-title">
                Importeren
              </h1>
              <p className={flow.m}>
                {revealed
                  ? 'Vul de gegevens van je mailing in.'
                  : 'Kies je adreslijst om te beginnen. Daarna vul je de gegevens van de mailing in.'}
              </p>
              {revealed && missing.length > 0 && (
                <p className={flow.missing} role="status">
                  {missingText(missing)}
                </p>
              )}
            </div>
            <div className={flow.tg}>
              <button
                type="button"
                className={`${flow.b} ${flow.primary}`}
                disabled={missing.length > 0 || saving}
                onClick={() => void onNext()}
              >
                {saving ? 'Aanmaken…' : 'Verder naar koppelen'}
              </button>
            </div>
          </div>
        </section>
        {saveError && (
          <div className={styles.banner} role="alert">
            {saveError}
          </div>
        )}

        {/* First only the address list, in the middle; once read, the details and then the list below. */}
        {revealed && (
          <DetailsForm
            draft={current}
            setDraft={setDraft}
            addresses={addresses}
            customers={customers}
            existing={false}
            codeError={codeError}
            onCodeChange={(value) => {
              setCodeTouched(true)
              setCodeError(null)
              setDraft((d) => ({ ...d, code: value }))
            }}
            minDate={today()}
          />
        )}
        <div className={revealed ? undefined : styles.fileStart}>
          <FileDrop file={fileCard} onFile={onFile} />
        </div>
      </div>

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="leave-title"
        onClose={() => setLeaveTo(null)}
      >
        <h2 id="leave-title">Weggaan zonder aan te maken?</h2>
        <p>
          Deze mailing is nog niet aangemaakt. Als je nu weggaat, ben je de ingevulde gegevens en de gekozen adreslijst kwijt.
        </p>
        <div className={styles.dialogFoot}>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              const to = leaveTo
              created.current = true
              dirtyRef.current = false
              dialog.current?.close()
              // Back: past the extra history entry of the guard, to the page before.
              if (to === 'back') history.go(-2)
              else if (to) router.push(to)
            }}
          >
            Weggaan
          </button>
          <button ref={stay} type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => dialog.current?.close()}>
            Blijven
          </button>
        </div>
      </dialog>
    </div>
  )
}

/** Codes in use, also those of unreadable mailings whose code is still readable. */
function takenCodes(items: MailingListItem[]): string[] {
  return items.flatMap((i) => (i.ok ? [i.summary.code] : i.code ? [i.code] : []))
}

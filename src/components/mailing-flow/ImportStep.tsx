'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconPlugConnected } from '@tabler/icons-react'
import {
  missingDetails,
  nextMailingCode,
  presortLocked,
  roundSequenceAllowed,
  type Mailing,
} from '@/core/masspost/store/mailing'
import { CodeTakenError, RevisionConflictError, StoreUnavailableError } from '@/core/masspost/store/mailing-store'
import { sha256Hex } from '@/core/masspost/store/hash'
import type { TenantDefaults } from '@/lib/tenant/settings-schema'
import { PageHeader } from '@/components/app-shell/AppShell'
import { Placeholder } from '@/components/app-shell/Placeholder'
import { STORE_UNAVAILABLE_MESSAGE, useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { LoadedList } from './columns'
import { FileDrop, readAddressFile } from './FileDrop'
import { initialDraft, missingText, toDetails, withFile, withFormat, type ImportDraft } from './import-draft'
import { StepBar } from './StepBar'
import { useLeaveGuard } from './useLeaveGuard'
import flow from './mailing-flow.module.css'
import styles from '@/components/app-shell/app.module.css'

/** Today in the local time zone, as `YYYY-MM-DD`. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function draftFromMailing(m: Mailing): ImportDraft {
  return {
    customer: m.customer.name,
    title: m.title,
    code: m.code,
    expectedDeliveryDate: m.expectedDeliveryDate,
    format: m.format,
    priority: m.priority,
    genMID: m.genMID,
    genPSC: m.genPSC,
    roundAndSequence: m.roundAndSequence,
    roundSequenceTouched: true,
  }
}

type Props = { mode: 'new'; defaults: TenantDefaults } | { mode: 'edit'; mailing: Mailing }

/**
 * Step 1 Importeren (SR-112 §5): the details of the mailing and the address list. The mailing is
 * only created on "Verder naar koppelen". With `mode: 'edit'` the same screen changes the details
 * of an existing mailing; the code and the file stay as they are.
 */
export function ImportStep(props: Props) {
  const { store, user } = useMailingStore()
  const router = useRouter()
  const editing = props.mode === 'edit' ? props.mailing : null
  const prefix = props.mode === 'new' ? props.defaults.codePrefix : ''
  // The start values are fixed for the life of the screen.
  const [start] = useState<ImportDraft>(() =>
    editing ? draftFromMailing(editing) : initialDraft((props as { defaults: TenantDefaults }).defaults, ''),
  )
  const [draft, setDraft] = useState<ImportDraft>(start)
  const [codeTouched, setCodeTouched] = useState(false)
  const [codes, setCodes] = useState<string[]>([])
  const [customers, setCustomers] = useState<string[]>([])
  const [loaded, setLoaded] = useState<{ list: LoadedList; bytes: ArrayBuffer; file: File } | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [leaveTo, setLeaveTo] = useState<string | null>(null)
  const created = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const stay = useRef<HTMLButtonElement>(null)

  const addresses = editing ? editing.counts.addresses : (loaded?.list.rows.length ?? null)
  const fileCard = editing
    ? { name: editing.source.name, addresses: editing.counts.addresses }
    : loaded
      ? { name: loaded.file.name, addresses: loaded.list.rows.length }
      : null

  // Codes and customers already in use: for the proposed code and the customer suggestions.
  useEffect(() => {
    let alive = true
    store
      .list()
      .then((items) => {
        if (!alive) return
        const ok = items.flatMap((i) => (i.ok ? [i.summary] : []))
        setCodes(ok.map((s) => s.code))
        setCustomers([...new Set(ok.map((s) => s.customer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl')))
      })
      .catch((e) => {
        if (alive && e instanceof StoreUnavailableError) setSaveError(STORE_UNAVAILABLE_MESSAGE)
      })
    return () => {
      alive = false
    }
  }, [store])

  const proposed = useMemo(() => nextMailingCode(prefix || 'M', new Date().getFullYear(), codes), [prefix, codes])
  const code = editing || codeTouched ? draft.code : proposed
  const current = { ...draft, code }

  const missing = missingDetails(
    { title: current.title, code: current.code, expectedDeliveryDate: current.expectedDeliveryDate, hasFile: !!fileCard },
    editing ? '0000-00-00' : today(),
  )
  const dirty = !editing && !created.current && (loaded !== null || JSON.stringify(draft) !== JSON.stringify(start))

  // Leaving with filled-in details: ask first (SR-112 §5, decision 20). Links and the back button
  // inside the app go through the dialog; reloading or closing the tab gets the browser's question.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useLeaveGuard(() => dirtyRef.current, setLeaveTo, { back: !editing })
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

  function update(change: Partial<ImportDraft>) {
    setDraft((d) => ({ ...d, ...change }))
  }

  async function onFile(file: File): Promise<string | null> {
    const result = await readAddressFile(file)
    if (!result.ok) return result.error
    setLoaded({ list: result.list, bytes: result.bytes, file })
    setDraft((d) => withFile(d, file.name, result.list.rows.length))
    return null
  }

  async function onNext() {
    if (missing.length || saving) return
    setSaving(true)
    setCodeError(null)
    setSaveError(null)
    try {
      if (editing) {
        const details: Partial<ReturnType<typeof toDetails>> = toDetails(current)
        delete details.code
        await store.update(editing.id, details, editing.revision, user.email, 'details')
        router.push(`/mailings/${encodeURIComponent(editing.code)}`)
        return
      }
      if (!loaded) return
      if (await store.findByCode(current.code)) throw new CodeTakenError(current.code)
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
        const all = await store.list().then((items) => items.flatMap((i) => (i.ok ? [i.summary.code] : [])))
        setCodes(all)
        setCodeError(`Deze code bestaat al. Volgende vrije: ${nextMailingCode(prefix || 'M', new Date().getFullYear(), all)}`)
      } else if (e instanceof RevisionConflictError) {
        setSaveError('Deze mailing is intussen gewijzigd. Herlaad de pagina en probeer opnieuw.')
      } else if (e instanceof StoreUnavailableError) {
        setSaveError(STORE_UNAVAILABLE_MESSAGE)
      } else {
        setSaveError('Bewaren lukte niet. Probeer het opnieuw.')
      }
    } finally {
      setSaving(false)
    }
  }

  const locked = addresses !== null && presortLocked(current.format, addresses)
  const rsAllowed = roundSequenceAllowed(current.format)

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
                {editing ? 'Gegevens aanpassen' : 'Importeren'}
              </h1>
              <p className={flow.m}>
                {editing
                  ? 'Pas de gegevens van je mailing aan. De code en de adreslijst blijven dezelfde.'
                  : 'Vul de gegevens van je mailing in en kies je adreslijst.'}
              </p>
              {missing.length > 0 && (
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
                {editing ? (saving ? 'Bewaren…' : 'Bewaren') : saving ? 'Aanmaken…' : 'Verder naar koppelen'}
              </button>
            </div>
          </div>
        </section>
        {saveError && (
          <div className={styles.banner} role="alert">
            {saveError}
          </div>
        )}

        <div className={styles.card}>
          <h2>Gegevens van de mailing</h2>
          <p className={styles.lead}>
            Verplichte velden zijn aangeduid met een sterretje (<span className={styles.req}>*</span>). Formaat, prioriteit,
            barcode en presortering komen uit Instellingen. Je kan alles aanpassen tot je de mailing indient.
          </p>
          <div className={styles.grid3}>
            <div className={styles.field}>
              <label htmlFor="f-klant">Klant</label>
              <div className={styles.withIcon}>
                <input
                  id="f-klant"
                  list="f-klanten"
                  placeholder="Kies of typ een klant"
                  value={current.customer}
                  onChange={(e) => update({ customer: e.target.value })}
                />
                <Placeholder tip="Koppeling met je CRM komt later">
                  <IconPlugConnected size={16} stroke={1.75} aria-label="Koppeling met je CRM" />
                </Placeholder>
              </div>
              <datalist id="f-klanten">
                {customers.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className={styles.field}>
              <label htmlFor="f-title">
                Titel <span className={styles.req}>*</span>
              </label>
              <input
                id="f-title"
                placeholder="Leeg? Dan nemen we de bestandsnaam"
                value={current.title}
                maxLength={200}
                onChange={(e) => update({ title: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="f-code">
                Code <span className={styles.req}>*</span>
              </label>
              <input
                id="f-code"
                value={current.code}
                maxLength={20}
                readOnly={!!editing}
                aria-describedby="f-code-hint"
                aria-invalid={!!codeError}
                onChange={(e) => {
                  setCodeTouched(true)
                  setCodeError(null)
                  update({ code: e.target.value })
                }}
              />
              <span id="f-code-hint" className={codeError ? styles.fieldError : styles.hint} role={codeError ? 'alert' : undefined}>
                {codeError ??
                  (editing
                    ? 'De code blijft dezelfde: ze is ook de referentie bij bpost.'
                    : 'Volgend vrij nummer. Letters, cijfers en koppeltekens.')}
              </span>
            </div>
            <div className={styles.field}>
              <label htmlFor="f-date">
                Geplande afgiftedatum <span className={styles.req}>*</span>
              </label>
              <input
                id="f-date"
                type="date"
                min={editing ? undefined : today()}
                value={current.expectedDeliveryDate}
                onChange={(e) => update({ expectedDeliveryDate: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="f-format">
                Formaat <span className={styles.req}>*</span>
              </label>
              <select
                id="f-format"
                value={current.format}
                onChange={(e) => setDraft((d) => withFormat(d, e.target.value as ImportDraft['format'], addresses))}
              >
                <option value="Small">Klein formaat</option>
                <option value="Large">Groot formaat</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="f-prio">
                Prioriteit <span className={styles.req}>*</span>
              </label>
              <select id="f-prio" value={current.priority} onChange={(e) => update({ priority: e.target.value as ImportDraft['priority'] })}>
                <option value="NP">Non-prior</option>
                <option value="P">Prior</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="f-barcode">Barcode</label>
              <select id="f-barcode" value={current.genMID} onChange={(e) => update({ genMID: e.target.value as ImportDraft['genMID'] })}>
                <option value="N">Geen</option>
                <option value="7">bpost, 7 cijfers</option>
                <option value="9">bpost, 9 cijfers</option>
                <option value="11">bpost, 11 cijfers</option>
                <option disabled>Contrapunt, 11 cijfers (binnenkort)</option>
              </select>
            </div>
            <div className={styles.field}>
              <span className={styles.flabel}>Presortering</span>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={current.genPSC === 'Y'}
                  disabled={locked}
                  aria-describedby="f-psc-hint"
                  onChange={(e) => update({ genPSC: e.target.checked ? 'Y' : 'N' })}
                />{' '}
                bpost maakt de presorteercodes
              </label>
              <span className={styles.hint} id="f-psc-hint">
                {locked ? 'Verplicht bij klein formaat vanaf 25.000 adressen.' : ''}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.flabel}>Ronde en sequentie</span>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={current.roundAndSequence}
                  disabled={!rsAllowed}
                  aria-describedby="f-rs-hint"
                  onChange={(e) => update({ roundAndSequence: e.target.checked, roundSequenceTouched: true })}
                />{' '}
                bpost geeft per brief de sequentie
              </label>
              <span className={styles.hint} id="f-rs-hint">
                {rsAllowed ? 'Standaard aan vanaf 10.000 adressen.' : 'Enkel bij groot formaat.'}
              </span>
            </div>
          </div>
        </div>

        <FileDrop file={fileCard} locked={!!editing} onFile={editing ? undefined : onFile} />
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

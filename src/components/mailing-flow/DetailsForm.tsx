'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { IconPlugConnected } from '@tabler/icons-react'
import { presortLocked, roundSequenceAllowed } from '@/core/masspost/store/mailing'
import { StoreUnavailableError } from '@/core/masspost/store/mailing-store'
import { Placeholder } from '@/components/app-shell/Placeholder'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'
import { FileDrop } from './FileDrop'
import { withFormat, type ImportDraft } from './import-draft'
import styles from '@/components/app-shell/app.module.css'

/**
 * Customers of the existing mailings, for the suggestions under "Klant".
 * @param onUnavailable Called when the browser cannot store anything.
 * @returns The names, sorted.
 */
export function useCustomerSuggestions(onUnavailable?: () => void): string[] {
  const { store } = useMailingStore()
  const [customers, setCustomers] = useState<string[]>([])
  // Once per store: the callback may be new on every render.
  const unavailable = useRef(onUnavailable)
  unavailable.current = onUnavailable
  useEffect(() => {
    let alive = true
    store
      .list()
      .then((items) => {
        if (!alive) return
        const names = items.flatMap((i) => (i.ok && i.summary.customer ? [i.summary.customer] : []))
        setCustomers([...new Set(names)].sort((a, b) => a.localeCompare(b, 'nl')))
      })
      .catch((e) => {
        if (alive && e instanceof StoreUnavailableError) unavailable.current?.()
      })
    return () => {
      alive = false
    }
  }, [store])
  return customers
}

/**
 * The details of a mailing and its address list (step 1), for a new mailing and for changing an
 * existing one. In an existing mailing the code and the list stay as they are.
 * @param props The draft and how to change it, the suggestions, and what is fixed.
 */
export function DetailsForm({
  draft,
  setDraft,
  addresses,
  customers,
  existing,
  codeError,
  onCodeChange,
  minDate,
  file,
  onFile,
}: {
  draft: ImportDraft
  setDraft: Dispatch<SetStateAction<ImportDraft>>
  /** Number of addresses in the list, or null before a list is read. */
  addresses: number | null
  customers: string[]
  /** An existing mailing: the code and the list cannot change. */
  existing: boolean
  codeError?: string | null
  onCodeChange?: (code: string) => void
  /** Earliest delivery date (today for a new mailing). */
  minDate?: string
  file: { name: string; addresses: number } | null
  onFile?: (file: File) => Promise<string | null>
}) {
  const update = (change: Partial<ImportDraft>) => setDraft((d) => ({ ...d, ...change }))
  const locked = addresses !== null && presortLocked(draft.format, addresses)
  const rsAllowed = roundSequenceAllowed(draft.format)

  return (
    <>
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
                value={draft.customer}
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
              value={draft.title}
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
              value={draft.code}
              maxLength={20}
              readOnly={existing}
              aria-describedby="f-code-hint"
              aria-invalid={!!codeError}
              onChange={(e) => onCodeChange?.(e.target.value)}
            />
            <span id="f-code-hint" className={codeError ? styles.fieldError : styles.hint} role={codeError ? 'alert' : undefined}>
              {codeError ??
                (existing
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
              min={minDate}
              value={draft.expectedDeliveryDate}
              onChange={(e) => update({ expectedDeliveryDate: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="f-format">
              Formaat <span className={styles.req}>*</span>
            </label>
            <select
              id="f-format"
              value={draft.format}
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
            <select id="f-prio" value={draft.priority} onChange={(e) => update({ priority: e.target.value as ImportDraft['priority'] })}>
              <option value="NP">Non-prior</option>
              <option value="P">Prior</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="f-barcode">Barcode</label>
            <select id="f-barcode" value={draft.genMID} onChange={(e) => update({ genMID: e.target.value as ImportDraft['genMID'] })}>
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
                checked={draft.genPSC === 'Y'}
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
                checked={draft.roundAndSequence}
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

      <FileDrop file={file} locked={existing} onFile={onFile} />
    </>
  )
}

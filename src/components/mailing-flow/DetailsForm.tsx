'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { IconInfoCircle, IconPlugConnected } from '@tabler/icons-react'
import { presortLocked, roundSequenceAllowed, type MissingDetail } from '@/core/masspost/store/mailing'
import { StoreUnavailableError } from '@/core/masspost/store/mailing-store'
import { Placeholder } from '@/components/app-shell/Placeholder'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'
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
 * What each field means, from bpost's guide (MailingCreate, Mail-ID Data Exchange Technical Guide)
 * and the manual of the Address File Tool, in plain words for the hover tip next to the label.
 */
export const FIELD_TIPS = {
  customer: 'Voor wie je deze mailing verstuurt. Enkel voor jezelf: bpost krijgt dit niet.',
  title: 'Een naam om de mailing terug te vinden. Enkel voor jezelf: bpost krijgt dit niet.',
  code: 'Jouw unieke referentie voor deze mailing bij bpost. Maximaal 20 tekens.',
  date: 'De dag waarop je de brieven bij bpost afgeeft. Dat moet een werkdag zijn.',
  format:
    'Het formaat van je brieven. Klein formaat: afgifte met Mail ID, gesorteerd of niet. Groot formaat: afgifte op ronde en sequentie.',
  priority: 'Prior of non-prior: hoe snel bpost je brieven bezorgt. Geldt voor elke brief van de mailing.',
  barcode:
    'Of bpost de Mail ID-barcodes voor je maakt, met 7, 9 of 11 cijfers. Kies Geen als je de barcodes zelf meegeeft.',
  presort: 'bpost maakt de presorteercodes, voor brieven die je niet zelf sorteerde.',
  roundSequence:
    'Enkel bij groot formaat. bpost geeft per brief een sequentie, die je op de envelop drukt om de brieven in de juiste volgorde af te geven.',
} as const

/** A label with what the field means in a hover tip (also on keyboard focus of the icon). */
function FieldLabel({ htmlFor, label, required, tip }: { htmlFor?: string; label: string; required?: boolean; tip: string }) {
  const text = (
    <>
      {label}
      {required && (
        <>
          {' '}
          <span className={styles.req}>*</span>
        </>
      )}
    </>
  )
  return (
    <div className={styles.labelRow} data-tip={tip}>
      {htmlFor ? <label htmlFor={htmlFor}>{text}</label> : <span className={styles.flabel}>{text}</span>}
      <span className={styles.info} role="img" tabIndex={0} aria-label={`Uitleg: ${tip}`}>
        <IconInfoCircle size={14} stroke={1.75} aria-hidden="true" />
      </span>
    </div>
  )
}

/**
 * The details of a mailing (step 1), for a new mailing and for changing an existing one. The address
 * list sits below it, in the step itself. In an existing mailing the code stays as it is. What is
 * missing shows under its field, in red, as in the format check.
 * @param props The draft and how to change it, what is missing, the suggestions, and what is fixed.
 */
export function DetailsForm({
  draft,
  setDraft,
  missing,
  addresses,
  customers,
  existing,
  codeError,
  onCodeChange,
  minDate,
}: {
  draft: ImportDraft
  setDraft: Dispatch<SetStateAction<ImportDraft>>
  /** From `missingDetails`: shown under the fields. */
  missing: readonly MissingDetail[]
  /** Number of addresses in the list, or null before a list is read. */
  addresses: number | null
  customers: string[]
  /** An existing mailing: the code and the list cannot change. */
  existing: boolean
  codeError?: string | null
  onCodeChange?: (code: string) => void
  /** Earliest delivery date (today for a new mailing). */
  minDate?: string
}) {
  const update = (change: Partial<ImportDraft>) => setDraft((d) => ({ ...d, ...change }))
  const locked = addresses !== null && presortLocked(draft.format, addresses)
  const rsAllowed = roundSequenceAllowed(draft.format)
  const titleError = missing.includes('title') ? 'Vul een titel in.' : null
  const dateError = missing.includes('date')
    ? draft.expectedDeliveryDate
      ? 'Kies een datum vanaf vandaag.'
      : 'Kies een afgiftedatum.'
    : null
  const codeMessage =
    codeError ?? (missing.includes('code') ? 'Gebruik letters, cijfers en koppeltekens, maximaal 20 tekens.' : null)

  return (
    <div className={styles.card}>
      <h2>Gegevens van de mailing</h2>
      <p className={styles.lead}>
        Verplichte velden zijn aangeduid met een sterretje (<span className={styles.req}>*</span>). Formaat, prioriteit,
        barcode en presortering komen uit Instellingen. Je kan alles aanpassen tot je de mailing indient.
      </p>
      <div className={styles.grid3}>
        <div className={styles.field}>
          <FieldLabel htmlFor="f-klant" label="Klant" tip={FIELD_TIPS.customer} />
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
          <FieldLabel htmlFor="f-title" label="Titel" required tip={FIELD_TIPS.title} />
          <input
            id="f-title"
            placeholder="Leeg? Dan nemen we de bestandsnaam"
            value={draft.title}
            maxLength={200}
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'f-title-err' : undefined}
            onChange={(e) => update({ title: e.target.value })}
          />
          {titleError && (
            <span id="f-title-err" className={styles.fieldError}>
              {titleError}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <FieldLabel htmlFor="f-code" label="Code" required tip={FIELD_TIPS.code} />
          <input
            id="f-code"
            value={draft.code}
            maxLength={20}
            readOnly={existing}
            aria-describedby="f-code-hint"
            aria-invalid={!!codeMessage}
            onChange={(e) => onCodeChange?.(e.target.value)}
          />
          <span id="f-code-hint" className={codeMessage ? styles.fieldError : styles.hint} role={codeError ? 'alert' : undefined}>
            {codeMessage ??
              (existing
                ? 'De code blijft dezelfde: ze is ook de referentie bij bpost.'
                : 'Volgend vrij nummer. Letters, cijfers en koppeltekens.')}
          </span>
        </div>
        <div className={styles.field}>
          <FieldLabel htmlFor="f-date" label="Geplande afgiftedatum" required tip={FIELD_TIPS.date} />
          <input
            id="f-date"
            type="date"
            min={minDate}
            value={draft.expectedDeliveryDate}
            aria-invalid={!!dateError}
            aria-describedby={dateError ? 'f-date-err' : undefined}
            onChange={(e) => update({ expectedDeliveryDate: e.target.value })}
          />
          {dateError && (
            <span id="f-date-err" className={styles.fieldError}>
              {dateError}
            </span>
          )}
        </div>
        <div className={styles.field}>
          <FieldLabel htmlFor="f-format" label="Formaat" required tip={FIELD_TIPS.format} />
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
          <FieldLabel htmlFor="f-prio" label="Prioriteit" required tip={FIELD_TIPS.priority} />
          <select id="f-prio" value={draft.priority} onChange={(e) => update({ priority: e.target.value as ImportDraft['priority'] })}>
            <option value="NP">Non-prior</option>
            <option value="P">Prior</option>
          </select>
        </div>
        <div className={styles.field}>
          <FieldLabel htmlFor="f-barcode" label="Barcode" tip={FIELD_TIPS.barcode} />
          <select id="f-barcode" value={draft.genMID} onChange={(e) => update({ genMID: e.target.value as ImportDraft['genMID'] })}>
            <option value="N">Geen</option>
            <option value="7">bpost, 7 cijfers</option>
            <option value="9">bpost, 9 cijfers</option>
            <option value="11">bpost, 11 cijfers</option>
            <option disabled>Contrapunt, 11 cijfers (binnenkort)</option>
          </select>
        </div>
        <div className={styles.field}>
          <FieldLabel label="Presortering" tip={FIELD_TIPS.presort} />
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
          <FieldLabel label="Ronde en sequentie" tip={FIELD_TIPS.roundSequence} />
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
  )
}

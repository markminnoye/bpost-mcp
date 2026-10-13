'use client'

import { useEffect, useRef, useState } from 'react'
import { missingDetails, type Mailing } from '@/core/masspost/store/mailing'
import type { MailingChange } from '@/core/masspost/store/mailing-store'
import { DetailsForm, useCustomerSuggestions } from './DetailsForm'
import { FileDrop } from './FileDrop'
import { NextButton } from './NextButton'
import { StepAction } from './StepAction'
import { toDetails, type ImportDraft } from './import-draft'
import styles from './mailing-flow.module.css'

/**
 * The draft of an existing mailing.
 * @param m The mailing as stored.
 * @returns The fields of step 1.
 */
export function draftFromMailing(m: Mailing): ImportDraft {
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

/**
 * Step 1 of an existing mailing, inside its flow: the same form as for a new mailing, without the
 * code and the list. Like the other steps it saves by itself: each complete change goes to
 * `onChange` (the flow saves it 2 s later, or at once on a step change or when leaving). While a
 * required field is empty, nothing is saved and `onMissing` reports how many are missing.
 * @param props The mailing, and the callbacks to save, report and go on.
 */
export function DetailsStep({
  mailing,
  onChange,
  onMissing,
  onNext,
}: {
  mailing: Mailing
  onChange: (change: MailingChange) => void
  /** Number of missing required fields (0: complete). */
  onMissing: (missing: number) => void
  onNext: () => void
}) {
  // The start values are fixed while the step is open; later saves come from this form.
  const [draft, setDraft] = useState<ImportDraft>(() => draftFromMailing(mailing))
  const customers = useCustomerSuggestions()
  const missing = missingDetails(
    { title: draft.title, code: draft.code, expectedDeliveryDate: draft.expectedDeliveryDate, hasFile: true },
    '0000-00-00',
  )

  const callbacks = useRef({ onChange, onMissing })
  callbacks.current = { onChange, onMissing }
  useEffect(() => {
    callbacks.current.onMissing(missing.length)
  }, [missing.length])

  // Every change that is complete gets saved; the first render is the stored state, not a change.
  const reported = useRef(JSON.stringify(draft))
  useEffect(() => {
    const json = JSON.stringify(draft)
    if (json === reported.current || missing.length > 0) return
    reported.current = json
    const details: Partial<ReturnType<typeof toDetails>> = toDetails(draft)
    delete details.code
    callbacks.current.onChange(details)
  }, [draft, missing.length])

  return (
    <>
      <section aria-label="Importeren" style={{ marginBottom: 16 }}>
        <p className={styles.m}>Pas de gegevens van je mailing aan. De code en de adreslijst blijven dezelfde.</p>
        <StepAction step="upload">
          <NextButton disabled={missing.length > 0} onClick={onNext}>
            Verder naar koppelen
          </NextButton>
        </StepAction>
      </section>
      {/* The same order as for a new mailing once its list is read: the details, then the list. */}
      <DetailsForm
        draft={draft}
        setDraft={setDraft}
        missing={missing}
        addresses={mailing.counts.addresses}
        customers={customers}
        existing
      />
      <FileDrop file={{ name: mailing.source.name, addresses: mailing.counts.addresses }} locked />
    </>
  )
}

'use client'

import { useRef, useState, type Dispatch, type DragEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { IconAlertTriangle, IconCheck, IconDownload, IconFileTypeXml, IconPrinter, IconRefresh } from '@tabler/icons-react'
import { estimateArr } from '@/core/masspost/address-check'
import { explainRefusal, latestExchange } from '@/core/masspost/exchange'
import type { BpostIds } from '@/core/masspost/request-file'
import { isBpostWorkingDay, isWaiting, modeOf, type Mailing } from '@/core/masspost/store/mailing'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'
import { shortDate } from '@/components/mailings/labels'
import { ArrBar } from './ArrBar'
import { CheckGroups } from './CheckGroups'
import type { CorrectionAction, Corrections } from './corrections'
import { savePrinterFileForMailing } from './exports'
import app from '@/components/app-shell/app.module.css'
import styles from './mailing-flow.module.css'
import { NextButton } from './NextButton'
import { StepAction } from './StepAction'
import type { BpostExchange } from './useBpostExchange'

const MODE_LABEL = { T: 'Test', C: 'Certificatie', P: 'Productie' } as const

const ICON = { size: 14, stroke: 1.75, 'aria-hidden': true } as const
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/**
 * The time bpost wrote on the acknowledgement, e.g. "1 okt 16:11". The stamp has no time zone.
 * @param stamp `FileReceived/@timeStamp`, or nothing.
 * @returns Day, short month and hours:minutes, or null when the stamp is missing.
 */
function receivedWhen(stamp: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(stamp ?? '')
  if (!match) return null
  const month = MONTHS[Number(match[2]) - 1]
  if (!month) return null
  return `${Number(match[3])} ${month} ${match[4]}:${match[5]}`
}

/** Starts a browser download of a file that is already in the outbox. */
function saveNow(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

/** The e-MassPost portal, where the outgoing file is uploaded under Upload. */
const EMASSPOST_PORTAL = 'https://osp.bpost.be/Masspost-Webcounter/jsp/userManagementAction.do?action=authenticateUser'

/**
 * One file in the outbox. A click saves it; in Chrome the row drags to the Finder.
 * Without a URL yet, the click saves it through the mailbox.
 */
function SaveLink({ name, url, onSave }: { name: string; url: string | null; onSave: () => void }) {
  const drag = (e: DragEvent<HTMLAnchorElement>) => {
    if (!url) return
    e.dataTransfer.setData('DownloadURL', `application/xml:${name}:${url}`)
    e.dataTransfer.effectAllowed = 'copy'
  }
  const file = (
    <>
      <IconFileTypeXml size={18} stroke={1.5} aria-hidden="true" />
      <span className={styles.mailName}>{name}</span>
    </>
  )
  if (url) {
    return (
      <a className={styles.mailFile} href={url} download={name} draggable onDragStart={drag}>
        {file}
      </a>
    )
  }
  return (
    <button type="button" className={styles.mailFile} onClick={onSave}>
      {file}
    </button>
  )
}

/** The tray on the dashed rim, the original PNG, not re-encoded. */
function TrayImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- keep the supplied PNG byte for byte
    <img src={src} alt="" width={38} height={38} />
  )
}

/** Title and short line on the top edge of a dashed mailbox. */
function MailLabel({ id, icon, title, hint }: { id: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <span className={styles.mailLabel}>
      {icon}
      <span className={styles.dropText}>
        <span id={id}>{title}</span>
        <small>{hint}</small>
      </span>
    </span>
  )
}

/** Opens the e-MassPost portal in a new tab (Upload / Download there). */
function PortalLink({ children = 'e-MassPost' }: { children?: ReactNode }) {
  return (
    <a href={EMASSPOST_PORTAL} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/**
 * "Indienen bij e-MassPost": on from 96 % with a valid delivery date (design 13/10, decisions 15–16).
 * When off, the button cannot take focus, so the tip sits on a focusable wrapper.
 */
function SubmitButton({
  arr,
  deliveryDate,
  today,
  busy,
  canSend,
  onSubmit,
}: {
  arr: number | null
  deliveryDate: string
  today: string
  busy: boolean
  canSend: boolean
  onSubmit: () => void
}) {
  const dateOk = deliveryDate >= today && isBpostWorkingDay(deliveryDate)
  const scoreOk = arr !== null && arr >= 96
  const can = canSend && scoreOk && dateOk && !busy
  const why = !dateOk
    ? 'De afgiftedatum is voorbij of geen werkdag. Pas ze aan in stap 1.'
    : !scoreOk
      ? 'De laatste score ligt onder 96 %. Verbeter of sluit adressen uit en laat e-MassPost opnieuw controleren.'
      : arr !== null && arr < 98
        ? 'Je kan indienen. Vanaf 98 % krijg je extra korting: opnieuw controleren kan de score nog verhogen.'
        : 'Klaar om in te dienen bij e-MassPost.'
  if (can) {
    return (
      <NextButton busy={busy} onClick={onSubmit}>
        Indienen bij e-MassPost
      </NextButton>
    )
  }
  return (
    <>
      <span tabIndex={0} data-tip={why} aria-describedby="submit-why">
        <NextButton disabled busy={busy}>
          Indienen bij e-MassPost
        </NextButton>
      </span>
      <span id="submit-why" className={styles.srOnly}>
        {why}
      </span>
    </>
  )
}

/** Summary after e-MassPost accepted the mailing, with the file for the printer. */
function SubmittedPanel({
  mailing,
  midCount,
}: {
  mailing: Mailing
  midCount: number
}) {
  const { store } = useMailingStore()
  const last = latestExchange(mailing, 'create')
  const mode = last?.mode ?? modeOf(mailing)
  const when = last?.sentAt ? shortDate(last.sentAt.slice(0, 10)) : ''
  const items = last?.items ?? mailing.counts.addresses
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      await savePrinterFileForMailing(store, mailing.id)
    } finally {
      setSaving(false)
    }
  }
  return (
    <section aria-label="Ingediend">
      <p className={styles.doneLine}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="9" fill="#16A34A" />
          <path
            d="M6.3 10.3 L8.8 12.7 L13.8 7.6"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>
          Ingediend · {MODE_LABEL[mode]}
          {when ? ` · ${when}` : ''} · {items} adressen aanvaard, {midCount} Mail ID&apos;s
        </span>
      </p>
      <div className={styles.printerCard}>
        <span className={styles.printerTitle}>
          <IconPrinter size={18} stroke={1.5} aria-hidden="true" />
          <span>
            Voor de drukker
            <small>Met de Mail ID en het adres zoals aangekondigd bij e-MassPost.</small>
          </span>
        </span>
        <button type="button" className={`${styles.b} ${styles.withIcon}`} disabled={saving} onClick={() => void save()}>
          <IconDownload size={14} stroke={1.75} aria-hidden="true" />
          Opslaan voor de drukker (.xlsx)
        </button>
      </div>
    </section>
  )
}

/**
 * Step 4, Adrescontrole (sketch adrescontrole.html v4.6): check at e-MassPost, wait, the result.
 * The buttons of the step sit in the page header and follow the state (design 13/10, decisions 16
 * and 19). Before the check and while waiting, one screen shows the files to and from e-MassPost.
 * @param props The mailing, the exchange with e-MassPost, the numbers of the tenant and the shared corrections.
 */
export function AddressCheckStep({
  mailing,
  exchange,
  bpost,
  corrections,
  dispatch,
  active,
}: {
  mailing: Mailing
  exchange: BpostExchange
  bpost: BpostIds | null
  corrections: Corrections
  dispatch: Dispatch<CorrectionAction>
  active: boolean
}) {
  const submitted = mailing.status === 'submitted'
  const waiting = isWaiting(mailing)
  const last = latestExchange(mailing)
  // A dropped file turns its icon green: the acknowledgement (_1AK), then the answer (_2RS).
  const ackIn = !!last && last.state !== 'sent' && (last.state === 'received' || !!last.receivedAt)
  const responseIn = !!last?.responseFile
  const checked = !!exchange.check
  const arr = exchange.check?.result.arr ?? mailing.arr
  const fileInput = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const canCheck = !!bpost && !exchange.busy
  const check = () => void exchange.send('check', 'T')
  const submit = () => void exchange.send('create', modeOf(mailing))
  const lastCheck = latestExchange(mailing, 'check')
  const today = new Date().toISOString().slice(0, 10)
  // The ARR after your changes, as a phantom on the card (decision 39 of 02/10).
  const estimate = exchange.check
    ? estimateArr({
        arr: exchange.check.result.arr,
        sentItems: lastCheck?.items ?? 0,
        rows: exchange.check.view.rows,
        values: corrections.values,
        excluded: corrections.excluded,
        excludedAtSend: lastCheck?.excluded ?? [],
      })
    : null
  const midCount = exchange.create?.items.filter((i) => i.midNum).length ?? 0

  const action = submitted ? null : waiting ? (
    <NextButton disabled busy>
      Wachten op e-MassPost
    </NextButton>
  ) : checked ? (
    <>
      <button
        type="button"
        className={`${styles.b} ${styles.withIcon} ${styles.headBtn}`}
        disabled={!canCheck}
        data-tip="Stuur de lijst met je aanpassingen opnieuw naar e-MassPost voor een nieuwe score. Er wordt nog niets ingediend."
        onClick={check}
      >
        <IconRefresh {...ICON} />
        <span className={app.btnLabel}>Opnieuw controleren</span>
      </button>
      <SubmitButton
        arr={arr}
        deliveryDate={mailing.expectedDeliveryDate}
        today={today}
        busy={exchange.busy}
        canSend={canCheck}
        onSubmit={submit}
      />
    </>
  ) : (
    <NextButton disabled={!canCheck} busy={exchange.busy} onClick={check}>
      Controleren bij e-MassPost
    </NextButton>
  )

  const receiveFiles = (files: File[]) => {
    if (files.length) void exchange.receive(files)
  }

  return (
    <section aria-label="Adrescontrole">
      {action && <StepAction step="check">{action}</StepAction>}

      {!bpost && !submitted && (
        <p className={styles.alert} role="alert">
          Vul eerst je klantnummer en account-ID in bij <Link href="/instellingen">Instellingen</Link>.
        </p>
      )}
      {exchange.message && (
        <p className={styles.alert} role="alert">
          {exchange.message}
        </p>
      )}
      {last?.state === 'rejected' && (
        <p className={styles.alert} role="alert">
          e-MassPost weigerde het bestand. {explainRefusal(last.problem ?? '')} Kijk de lijst na en{' '}
          {last.kind === 'check' ? 'controleer opnieuw' : 'dien opnieuw in'}.
        </p>
      )}

      {submitted && <SubmittedPanel mailing={mailing} midCount={midCount} />}

      {!submitted && (waiting || !checked) && (
        <>
          <p className={styles.m}>
            {waiting ? (
              last?.kind === 'create' ? (
                <>
                  <PortalLink /> verwerkt je mailing. Zodra het antwoord er is, zie je hier of ze aanvaard is.
                </>
              ) : (
                <>
                  <PortalLink /> kijkt de adressen na. Zodra het antwoord er is, zie je hier het resultaat.
                </>
              )
            ) : (
              <>
                <PortalLink /> kijkt elk adres na en stelt verbeteringen voor. Klik op Controleren bij e-MassPost: het
                bestand voor e-MassPost komt bij Uitgaand. Klik in het vak om het op te slaan.
              </>
            )}
          </p>
          <div className={styles.boxes}>
            <section className={styles.mail} aria-labelledby="out-title">
              <div
                className={styles.dropBox}
                data-idle={waiting && last ? undefined : ''}
                data-download={waiting && last ? '' : undefined}
                onClick={(e) => {
                  if (!waiting || !last) return
                  if ((e.target as HTMLElement).closest('a,button')) return
                  if (exchange.outgoingUrl) saveNow(exchange.outgoingUrl, last.fileName)
                  else void exchange.resend()
                }}
              >
                <MailLabel
                  id="out-title"
                  icon={<TrayImage src="/outbox-tray.png" />}
                  title="Uitgaand · naar e-MassPost"
                  hint="Laad dit bestand op via e-MassPost."
                />
                {waiting && last && (
                  <SaveLink name={last.fileName} url={exchange.outgoingUrl} onSave={() => void exchange.resend()} />
                )}
              </div>
            </section>
            <section className={styles.mail} aria-labelledby="in-title">
              <button
                type="button"
                className={styles.dropBox}
                aria-labelledby="in-title"
                data-over={over ? '' : undefined}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(true)
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setOver(false)
                  receiveFiles([...e.dataTransfer.files])
                }}
              >
                <MailLabel
                  id="in-title"
                  icon={<TrayImage src="/inbox-tray.png" />}
                  title="Inkomend · van e-MassPost"
                  hint="Zet hier wat e-MassPost terugstuurt."
                />
                {!ackIn && !responseIn && (
                  <span className={styles.dropHint}>Sleep hierheen of klik om te kiezen</span>
                )}
                {ackIn && (
                  <span className={styles.mailFile}>
                    <IconFileTypeXml size={18} stroke={1.5} aria-hidden="true" />
                    Ontvangstbewijs
                    <span className={styles.ackOk}>
                      <IconCheck size={16} stroke={2.25} aria-hidden="true" />
                      <span className={styles.srOnly}>Ontvangen</span>
                      {receivedWhen(last?.receivedAt)}
                    </span>
                  </span>
                )}
                {responseIn && (
                  <span className={styles.mailFile}>
                    <IconFileTypeXml size={18} stroke={1.5} aria-hidden="true" />
                    {last?.responseFile}
                  </span>
                )}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".xml,.XML"
                multiple
                hidden
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = ''
                  receiveFiles(files)
                }}
              />
            </section>
          </div>
          <p className={styles.help}>
            Zolang er geen automatische verbinding met <PortalLink /> is, breng je deze bestanden zelf over via het
            portaal. Later gaat dat automatisch.
          </p>
        </>
      )}

      {!submitted && exchange.check && !waiting && (
        <>
          <p className={styles.m}>
            e-MassPost keek elk adres na. Neem de voorstellen over, verbeter wat e-MassPost niet vond, of sluit een adres
            uit. Daarna controleer je opnieuw, of dien je in.
          </p>
          <p className={styles.help}>
            Klik op een rij, of Tab tot in de lijst. Kies een rij met ↑ ↓ en druk Enter om het voorstel over te nemen, of
            E om zelf aan te passen. Bij een adres dat e-MassPost niet vond, kies je uit de voorstellen of typ je het adres
            als straat en nummer, postcode en gemeente. Je aanpassingen blijven bewaard.
          </p>
          <ArrBar arr={exchange.check.result.arr ?? 0} estimate={estimate} />
          {exchange.changed && (
            <p className={styles.changedNote}>
              <IconAlertTriangle size={15} stroke={1.75} aria-hidden="true" />
              <span>
                Je wijzigde de lijst na het versturen ·{' '}
                <button type="button" className={styles.linkBtn} disabled={!canCheck} onClick={check}>
                  Opnieuw controleren
                </button>
              </span>
            </p>
          )}
          <CheckGroups view={exchange.check.view} corrections={corrections} dispatch={dispatch} active={active} />
        </>
      )}
    </section>
  )
}

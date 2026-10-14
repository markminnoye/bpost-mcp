'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { groupCheckResult, type CheckView } from '@/core/masspost/address-check'
import { changedSinceSent, latestExchange, nextRefNumber, processResponse, recordSent } from '@/core/masspost/exchange'
import { ManualMailbox } from '@/core/masspost/mailbox'
import type { AddressField, MappedRow } from '@/core/masspost/mapping'
import { parseBpostResponse, type MailingResult } from '@/core/masspost/parse-response'
import {
  buildRequestFile,
  checkMailingRef,
  createMailingRef,
  correctedRows,
  decodeLatin1,
  itemsFingerprint,
  RequestInvalidError,
  type BpostIds,
  type BpostMode,
} from '@/core/masspost/request-file'
import { MAILING_FILES_DIR, StoreFullError } from '@/core/masspost/store/mailing-store'
import { STORE_FULL_MESSAGE, useMailingStore } from '@/components/mailings/MailingStoreProvider'
import type { Corrections } from './corrections'
import { saveFile } from './save-file'
import type { MailingSaver } from './useMailingSaver'

/** What step 4 needs from the exchange with e-MassPost. */
export interface BpostExchange {
  /** Puts a check (always T) or a submission (the mode of the mailing) in the outbox. Does not download it. */
  send: (kind: 'check' | 'create', mode: BpostMode) => Promise<void>
  /** Saves the last request to the computer (manual mailbox). */
  resend: () => Promise<void>
  /** Blob URL of the last request, so a click or a drag can save it. Null until it is loaded. */
  outgoingUrl: string | null
  /** Response files the user dropped. */
  receive: (files: readonly File[]) => Promise<void>
  /** The last processed check, read back from the store. */
  check: { result: MailingResult; view: CheckView } | null
  /** The last processed submission. */
  create: MailingResult | null
  /** The list changed since the last request was sent. */
  changed: boolean
  busy: boolean
  /** One sentence for the user (Vlaams), or null. */
  message: string | null
}

const XML = 'application/xml'
const MESSAGES = {
  invalid: 'Dit is geen antwoord van e-MassPost. Kies het XML-bestand dat eindigt op _2RS of _1AK.',
  older: 'Dit antwoord hoort bij een vorige controle; we tonen het nieuwste.',
  foreign: (ref: string | null) => (ref ? `Dit antwoord hoort bij een andere mailing (${ref}).` : 'Dit antwoord hoort niet bij deze mailing.'),
  invalidRequest: 'We konden het bestand voor e-MassPost niet maken. Kijk de formaatvalidatie na.',
  notSaved: 'Bewaren lukte niet, daarom maakten we geen bestand voor e-MassPost. Probeer het opnieuw.',
} as const

/**
 * Sending to e-MassPost and processing what comes back, through the mailbox and the store (design
 * 13/10). Today the mailbox is manual: sending saves the XML, the user drops the answer.
 * @param input The saver of the mailing, its mapped rows, the corrections and the numbers of the tenant.
 * @returns What step 4 needs.
 */
export function useBpostExchange(input: {
  saver: MailingSaver
  rows: MappedRow[]
  corrections: Corrections
  bpost: BpostIds | null
}): BpostExchange {
  const { saver, rows, corrections, bpost } = input
  const { store, user } = useMailingStore()
  const mailing = saver.mailing
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [checkResult, setCheckResult] = useState<MailingResult | null>(null)
  const [create, setCreate] = useState<MailingResult | null>(null)
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  // The only mailbox for now (decision 11); `DriveMailbox` replaces this line later.
  const mailbox = useMemo(() => new ManualMailbox((file) => saveFile(file.bytes, { name: file.name, mime: XML })), [])
  const going = useMemo(
    () => correctedRows(rows, corrections.values, Object.keys(corrections.excluded).map(Number)),
    [rows, corrections.values, corrections.excluded],
  )
  useEffect(() => {
    let alive = true
    void itemsFingerprint(going, mailing.priority).then((f) => {
      if (alive) setFingerprint(f)
    })
    return () => {
      alive = false
    }
  }, [going, mailing.priority])

  // The mailing as last saved, for the callbacks (a save in between changes it).
  const latest = useRef(mailing)
  useEffect(() => {
    latest.current = mailing
  }, [mailing])

  // The last processed check and submission, read back from their files (also after a reload). A refused
  // check later does not hide the last result. The file name decides when to read again.
  const processedCheck = mailing.exchanges?.findLast((e) => e.kind === 'check' && e.state === 'processed')
  const lastCreate = latestExchange(mailing, 'create')
  const checkFile = processedCheck?.responseFile
  const checkItems = processedCheck?.items ?? 0
  const createFile = lastCreate?.state === 'processed' ? lastCreate.responseFile : undefined
  useEffect(() => {
    let alive = true
    ;(async () => {
      const read = async (name?: string) => {
        const blob = name ? await store.getFile(mailing.id, MAILING_FILES_DIR + name) : null
        return blob ? (parseBpostResponse(decodeLatin1(new Uint8Array(await blob.arrayBuffer()))) as MailingResult) : null
      }
      const c = await read(checkFile)
      const s = await read(createFile)
      if (!alive) return
      setCheckResult(c)
      setCreate(s)
    })()
    return () => {
      alive = false
    }
  }, [store, mailing.id, checkFile, createFile])

  // The values of each row before any correction, so a change in step 4 keeps those of step 3.
  const base = useMemo(
    () =>
      new Map(
        rows.map((r) => [
          r.seq,
          Object.fromEntries(
            Object.entries(r.fields).flatMap(([field, v]) => (v ? [[field, v.value]] : [])),
          ) as Partial<Record<AddressField, string>>,
        ]),
      ),
    [rows],
  )
  const check = useMemo(
    () => (checkResult ? { result: checkResult, view: groupCheckResult(checkResult, checkItems, base) } : null),
    [checkResult, checkItems, base],
  )

  /** Everything waiting in the mailbox, one file at a time. */
  const processInbox = useCallback(async () => {
    let said: string | null = null
    for (const file of await mailbox.responses()) {
      const r = processResponse(latest.current, file.name, decodeLatin1(file.bytes), new Date())
      if (r.outcome === 'applied' || r.outcome === 'older') {
        await store.saveFile(latest.current.id, MAILING_FILES_DIR + file.name, new Blob([file.bytes as BlobPart], { type: XML }))
      }
      if (r.outcome === 'applied') {
        await saver.save(r.change, r.event)
        // The next file in the same drop sees this change (e.g. a _1AK after its _2RS stays ignored).
        latest.current = { ...latest.current, ...r.change }
      }
      said =
        r.outcome === 'invalid'
          ? MESSAGES.invalid
          : r.outcome === 'older'
            ? MESSAGES.older
            : r.outcome === 'foreign'
              ? MESSAGES.foreign(r.mailingRef)
              : said
      await mailbox.remove(file.name)
    }
    setMessage(said)
  }, [mailbox, saver, store])

  // Drops are handled one after the other: a second drop during the first must not process its files twice.
  const queue = useRef<Promise<void>>(Promise.resolve())

  const send = useCallback(
    async (kind: 'check' | 'create', mode: BpostMode) => {
      if (!bpost || busy) return
      setBusy(true)
      setMessage(null)
      try {
        await saver.flush()
        const m = latest.current
        const n = nextRefNumber(m, kind)
        const file = await buildRequestFile({
          kind,
          rows: going,
          mailingRef: kind === 'check' ? checkMailingRef(m.code, n) : createMailingRef(m.code, n),
          mode,
          priority: m.priority,
          ids: bpost,
          now: new Date(),
          create: { expectedDeliveryDate: m.expectedDeliveryDate, format: m.format, genMID: m.genMID, genPSC: m.genPSC },
        })
        await store.saveFile(m.id, MAILING_FILES_DIR + file.fileName, new Blob([file.bytes as BlobPart], { type: XML }))
        await saver.save(
          recordSent(m, file, Object.keys(corrections.excluded).map(Number), user.email, new Date()),
          kind === 'check' ? 'bpost-check-sent' : 'bpost-create-sent',
        )
        // The file stays in the outbox. A click or a drag saves it; nothing downloads on its own.
        if (saver.hasUnsaved()) setMessage(MESSAGES.notSaved)
      } catch (e) {
        if (e instanceof RequestInvalidError) setMessage(MESSAGES.invalidRequest)
        else if (e instanceof StoreFullError) setMessage(STORE_FULL_MESSAGE)
        else throw e
      } finally {
        setBusy(false)
      }
    },
    [bpost, busy, corrections.excluded, going, mailbox, saver, store, user.email],
  )

  const resend = useCallback(async () => {
    const last = latestExchange(latest.current)
    const blob = last ? await store.getFile(latest.current.id, MAILING_FILES_DIR + last.fileName) : null
    if (last && blob) await mailbox.send({ name: last.fileName, bytes: new Uint8Array(await blob.arrayBuffer()) })
  }, [mailbox, store])

  const receive = useCallback(
    (files: readonly File[]) => {
      const run = queue.current.then(async () => {
        try {
          for (const f of files) mailbox.receive({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })
          await processInbox()
        } catch (e) {
          if (e instanceof StoreFullError) setMessage(STORE_FULL_MESSAGE)
          else throw e
        }
      })
      // The next drop waits for this one, also when it failed.
      queue.current = run.catch(() => {})
      return run
    },
    [mailbox, processInbox],
  )

  // A click or a drag saves this file. Loaded when the outbox has one; revoked when it changes.
  const outgoingName = latestExchange(mailing)?.fileName
  const [outgoingUrl, setOutgoingUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    let url: string | undefined
    void (async () => {
      const blob = outgoingName ? await store.getFile(mailing.id, MAILING_FILES_DIR + outgoingName) : null
      if (!alive) return
      if (!blob) {
        setOutgoingUrl(null)
        return
      }
      url = URL.createObjectURL(blob)
      if (!alive) {
        URL.revokeObjectURL(url)
        return
      }
      setOutgoingUrl(url)
    })()
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [store, mailing.id, outgoingName])

  const last = latestExchange(mailing)
  return {
    send,
    resend,
    outgoingUrl,
    receive,
    check,
    create,
    changed: !!last && fingerprint !== null && changedSinceSent(last, fingerprint),
    busy,
    message,
  }
}

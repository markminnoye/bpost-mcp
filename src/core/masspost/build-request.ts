// src/core/masspost/build-request.ts
import type { Item } from '@/schemas/mailing-request'
import { UNSTRUCTURED_COMP_CODES, type MappedRow } from './mapping'
import type { MidProtocolVersion } from './credentials'

/**
 * SAFETY GUARD (temporary): Contrapunt is not yet certified for Production or Certification
 * mode, so this library refuses to build anything other than a Test request for now — see
 * `buildMailingRequest` below, which ignores `params.mode` and always forces 'T'.
 * Remove FORCE_TEST_MODE (and go back to honoring `params.mode`) only after explicit sign-off
 * once Contrapunt has gone through bpost's certification process. See
 * .agent/plans/2026-09-28-bpost-library-web-app.md.
 */
export const FORCE_TEST_MODE = true

export interface BuildRequestParams {
  mailingRef: string
  /** YYYY-MM-DD */
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  /** Ignored while FORCE_TEST_MODE is true (see above) — every request is sent as Test. */
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
}

/** Turns mapped rows into `Item`s using the unstructured Comp codes (90/91/92/93). */
export function rowsToItems(rows: MappedRow[], priority: 'P' | 'NP'): Item[] {
  return rows.map((row) => {
    const comps: { code: string; value?: string }[] = [
      { code: UNSTRUCTURED_COMP_CODES.name, value: row.fields.name.value },
      { code: UNSTRUCTURED_COMP_CODES.streetHouseBox, value: row.fields.streetHouseBox.value },
      { code: UNSTRUCTURED_COMP_CODES.postcodeCity, value: row.fields.postcodeCity.value },
    ]
    if (row.fields.companyDepartment?.value) {
      comps.push({
        code: UNSTRUCTURED_COMP_CODES.companyDepartment,
        value: row.fields.companyDepartment.value,
      })
    }
    return {
      seq: row.seq,
      priority,
      Comps: { Comp: comps },
    } as Item
  })
}

export interface BuildCheckParams {
  mailingRef: string
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  /** Ask bpost to rewrite addresses into the response. */
  copyRequestItem?: 'Y' | 'N'
  /** Max suggestions per address (0 = none). */
  suggestionsCount?: number
  /** Min Levenshtein score 1–100 for a suggestion to be returned. */
  suggestionsMinScore?: number
}

function headerAndContext(
  params: { mode: 'P' | 'T' | 'C'; customerFileRef: string },
  credentials: { customerId: string; accountId: string; midVersion?: MidProtocolVersion },
) {
  const customerId = Number(credentials.customerId)
  const accountId = Number(credentials.accountId)
  const midVersion = credentials.midVersion ?? '0200'

  if (FORCE_TEST_MODE && params.mode !== 'T') {
    console.warn(
      `[masspost] mode "${params.mode}" requested but FORCE_TEST_MODE is active — sending as Test ('T') instead.`,
    )
  }
  const effectiveMode = FORCE_TEST_MODE ? 'T' : params.mode

  return {
    midVersion,
    Context: {
      requestName: 'MailingRequest' as const,
      dataset: 'M037_MID' as const,
      sender: customerId,
      receiver: 'MID' as const,
      version: midVersion,
    },
    Header: {
      customerId,
      accountId,
      mode: effectiveMode,
      Files: {
        RequestProps: { customerFileRef: params.customerFileRef },
      },
    },
  }
}

/** Assembles the full MailingRequest object (Context + Header + MailingCreate/Items). */
export function buildMailingRequest(
  items: Item[],
  params: BuildRequestParams,
  credentials: {
    customerId: string
    accountId: string
    midVersion?: MidProtocolVersion
  },
) {
  const { midVersion, Context, Header } = headerAndContext(params, credentials)

  // Protocol 0100/0102: no expectedDeliveryDate, no FileInfo — children start at Format.
  // Version 0200: FileInfo then Format, plus expectedDeliveryDate.
  const mailingCreate: Record<string, unknown> = {
    seq: 1,
    mailingRef: params.mailingRef,
    genMID: params.genMID,
    genPSC: params.genPSC,
  }
  if (midVersion === '0200') {
    mailingCreate.expectedDeliveryDate = params.expectedDeliveryDate
    mailingCreate.FileInfo = { type: 'MID2' as const }
  }
  mailingCreate.Format = { value: params.format }
  mailingCreate.Items = { Item: items }
  mailingCreate.ItemCount = { value: items.length }

  return {
    Context,
    Header,
    MailingCreate: [mailingCreate],
  }
}

/**
 * OptiAddress: MailingRequest with only MailingCheck (no Format/FileInfo/expectedDeliveryDate).
 * Ask for suggestions via suggestionsCount + copyRequestItem.
 */
export function buildMailingCheckRequest(
  items: Item[],
  params: BuildCheckParams,
  credentials: {
    customerId: string
    accountId: string
    midVersion?: MidProtocolVersion
  },
) {
  const { Context, Header } = headerAndContext(params, credentials)
  // MailingCheck docs mark Item/@lang as mandatory — default nl for Contrapunt.
  const checkItems = items.map((item) => ({
    ...item,
    lang: item.lang ?? ('nl' as const),
  }))

  return {
    Context,
    Header,
    MailingCheck: [
      {
        seq: 1,
        mailingRef: params.mailingRef,
        genMID: 'N' as const,
        genPSC: 'N' as const,
        copyRequestItem: params.copyRequestItem ?? 'Y',
        suggestionsCount: params.suggestionsCount ?? 5,
        suggestionsMinScore: params.suggestionsMinScore ?? 60,
        Items: { Item: checkItems },
        ItemCount: { value: checkItems.length },
      },
    ],
  }
}

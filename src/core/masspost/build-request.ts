// src/core/masspost/build-request.ts
import type { Item } from '@/schemas/mailing-request'
import { COUNTRY_COMP_CODES, UNSTRUCTURED_COMP_CODES, isBelgianCountry, type MappedRow } from './mapping'
import type { MidProtocolVersion } from './credentials'

/**
 * SAFETY GUARD (precaution): by default this library builds only Test requests — every builder
 * ignores `params.mode` and forces 'T', so nothing reaches production by accident.
 * Contrapunt is already certified (Mark, 01/10/2026) and bpost accepted a Production Create
 * (no MID-1020), so this is no longer a certification rule. It stays until Mark decides when the
 * app may send in `C` or `P`.
 * Exception (01/10/2026, Mark): a caller may set `allowNonTestMode` to build a `C` or `P` file
 * for a deliberate protocol test through the portal upload tool. Only `scripts/generate-mailing-xml.ts`
 * does that, and it sends nothing. HTTP routes and the web app must never set it.
 * Remove FORCE_TEST_MODE (and go back to honoring `params.mode`) only after explicit sign-off
 * once the `C`/`P` tests (see .agent/plans/2026-10-01-masspost-api-and-web.md, phase 0b) are done.
 */
export const FORCE_TEST_MODE = true

/** Inputs for a MailingCreate request. `mode` is ignored while `FORCE_TEST_MODE` is true, unless `allowNonTestMode` is set. */
export interface BuildRequestParams {
  mailingRef: string
  /** YYYY-MM-DD */
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  /** Ignored while FORCE_TEST_MODE is true (see above) — every request is sent as Test. */
  mode: 'P' | 'T' | 'C'
  /** CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route. */
  allowNonTestMode?: boolean
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
}

/** Turns mapped rows into `Item`s using the unstructured Comp codes (90/91/92/93), plus the
 *  country for an address outside Belgium: Comp 17 for a two-letter code, Comp 18 for a name.
 *
 * @param rows Output of `mapRows`.
 * @param priority Item priority written on every item (`NP` or `P`).
 * @returns Items in the same order. `seq` is copied from the mapped row.
 */
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
    const country = row.fields.country?.value
    if (country && !isBelgianCountry(country)) {
      comps.push(
        /^[a-z]{2}$/i.test(country)
          ? { code: COUNTRY_COMP_CODES.isoCode, value: country.toUpperCase() }
          : { code: COUNTRY_COMP_CODES.name, value: country },
      )
    }
    return {
      seq: row.seq,
      priority,
      Comps: { Comp: comps },
    } as Item
  })
}

/** Inputs for an OptiAddress MailingCheck. No format and no delivery date. */
export interface BuildCheckParams {
  mailingRef: string
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  /** CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route. */
  allowNonTestMode?: boolean
  customerFileRef: string
  /** Ask bpost to rewrite addresses into the response. */
  copyRequestItem?: 'Y' | 'N'
  /** Max suggestions per address (0 = none). */
  suggestionsCount?: number
  /** Min Levenshtein score 1–100 for a suggestion to be returned. */
  suggestionsMinScore?: number
}

function headerAndContext(
  params: { mode: 'P' | 'T' | 'C'; customerFileRef: string; allowNonTestMode?: boolean },
  credentials: { customerId: string; accountId: string; midVersion?: MidProtocolVersion },
) {
  const customerId = Number(credentials.customerId)
  const accountId = Number(credentials.accountId)
  const midVersion = credentials.midVersion ?? '0200'

  const forceTest = FORCE_TEST_MODE && !params.allowNonTestMode
  if (forceTest && params.mode !== 'T') {
    console.warn(
      `[masspost] mode "${params.mode}" requested but FORCE_TEST_MODE is active — sending as Test ('T') instead.`,
    )
  }
  const effectiveMode = forceTest ? 'T' : params.mode

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

/** Assembles the full MailingRequest object (Context + Header + MailingCreate/Items).
 *
 * @param items Items from `rowsToItems`.
 * @param params Create parameters. Delivery date and file info are included only for protocol `0200`.
 * @param credentials Customer and account ids, plus an optional MID version (default `0200`).
 * @returns A plain object suitable for `validateMailingRequest`.
 */
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

/** Inputs for a MailingDelete. */
export interface BuildDeleteParams {
  /** `mailingRef` of the mailing list to delete. */
  mailingRef: string
  mode: 'P' | 'T' | 'C'
  /** CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route. */
  allowNonTestMode?: boolean
  customerFileRef: string
}

/**
 * MailingRequest with only MailingDelete. bpost's way to correct a mailing: delete it,
 * then create a new one under a new `mailingRef` (the barcodes change; only the latest are valid).
 *
 * @param params Mailing to delete. `mode` is ignored while `FORCE_TEST_MODE` is true.
 * @param credentials Customer and account ids, plus an optional MID version.
 * @returns A MailingRequest that contains only `MailingDelete`.
 */
export function buildMailingDeleteRequest(
  params: BuildDeleteParams,
  credentials: {
    customerId: string
    accountId: string
    midVersion?: MidProtocolVersion
  },
) {
  const { Context, Header } = headerAndContext(params, credentials)
  return {
    Context,
    Header,
    MailingDelete: [{ seq: 1, mailingRef: params.mailingRef }],
  }
}

/** Inputs for a MailingReuse. */
export interface BuildReuseParams {
  /** `mailingRef` of the new mailing. */
  mailingRef: string
  /** `mailingRef` of the existing mailing list to reuse. */
  sourceMailingRef: string
  /** Deposit the new mailing is attached to. Required by the XSD. */
  depositIdentifier: string
  depositIdentifierType?: 'depositRef' | 'tmpDepositNr'
  mode: 'P' | 'T' | 'C'
  /** CLI-only escape hatch for the FORCE_TEST_MODE guard. Never set it from a route. */
  allowNonTestMode?: boolean
  customerFileRef: string
}

/**
 * MailingRequest with only MailingReuse: a new mailing built on an existing list.
 * bpost answers MID-3061 when the source does not exist and MID-3062 when it was created manually.
 *
 * @param params New and source `mailingRef`, plus the deposit identifier. `mode` is ignored while `FORCE_TEST_MODE` is true.
 * @param credentials Customer and account ids, plus an optional MID version.
 * @returns A MailingRequest that contains only `MailingReuse`.
 */
export function buildMailingReuseRequest(
  params: BuildReuseParams,
  credentials: {
    customerId: string
    accountId: string
    midVersion?: MidProtocolVersion
  },
) {
  const { Context, Header } = headerAndContext(params, credentials)
  return {
    Context,
    Header,
    MailingReuse: [
      {
        seq: 1,
        mailingRef: params.mailingRef,
        sourceMailingRef: params.sourceMailingRef,
        depositIdentifier: params.depositIdentifier,
        depositIdentifierType: params.depositIdentifierType ?? ('depositRef' as const),
      },
    ],
  }
}

/**
 * OptiAddress: MailingRequest with only MailingCheck (no Format/FileInfo/expectedDeliveryDate).
 * Ask for suggestions via suggestionsCount + copyRequestItem.
 *
 * @param items Items from `rowsToItems`. Each item gets `lang: "nl"` when language is missing.
 * @param params Check parameters. Defaults: `copyRequestItem` Y, 5 suggestions, minimum score 60.
 * @param credentials Customer and account ids, plus an optional MID version.
 * @returns A MailingRequest that contains only `MailingCheck`.
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

// src/core/masspost/pipeline.ts
import { buildXml } from '@/lib/xml'
import { parseExcelAddresses } from './excel'
import { mapRows, type ColumnMapping, type MappingWarning } from './mapping'
import {
  rowsToItems,
  buildMailingRequest,
  buildMailingCheckRequest,
  type BuildRequestParams,
  type BuildCheckParams,
} from './build-request'
import { validateMailingRequest, type ValidationResult } from './validate'
import type { MidProtocolVersion } from './credentials'

/** Caller-supplied ids and an optional row cap. Not read from the environment. */
export interface ConvertOptions {
  customerId: string
  accountId: string
  midVersion?: MidProtocolVersion
  /** Cap number of mapped rows (e.g. 200 for Header mode=T — bpost test limit). */
  maxItems?: number
}

/** Excel-to-XML result. `xml` is omitted when validation fails. */
export interface ConvertResult {
  itemCount: number
  /** Total mapped rows before maxItems cap (if any). */
  sourceItemCount: number
  warnings: MappingWarning[]
  validation: ValidationResult
  /** Only set when validation passed. */
  xml?: string
}

function stripEmptyDepositType(data: NonNullable<ValidationResult['data']>) {
  for (const action of [...(data.MailingCreate ?? []), ...(data.MailingCheck ?? [])]) {
    if (!action.depositIdentifier) {
      delete (action as { depositIdentifierType?: unknown }).depositIdentifierType
    }
  }
}

/**
 * End-to-end: Excel → mapped rows → MailingCreate → validated → XML.
 *
 * @param file Workbook bytes.
 * @param mapping Column mapping for the unstructured address blocks.
 * @param params Create parameters (reference, format, priority, mode).
 * @param credentials Customer id, account id, optional MID version, and optional row cap.
 * @returns Counts, mapping warnings, validation, and XML when validation passed.
 * @example
 * const result = await convertExcelToMailingRequest(buffer, mapping, params, {
 *   customerId: '00000000',
 *   accountId: '00000000',
 * })
 * if (result.validation.valid) console.log(result.xml)
 */
export async function convertExcelToMailingRequest(
  file: Buffer | ArrayBuffer,
  mapping: ColumnMapping,
  params: BuildRequestParams,
  credentials: ConvertOptions,
): Promise<ConvertResult> {
  const { rows } = await parseExcelAddresses(file)
  const { rows: mappedRows, warnings } = mapRows(rows, mapping)
  const sourceItemCount = mappedRows.length
  const cappedRows =
    credentials.maxItems !== undefined && credentials.maxItems > 0
      ? mappedRows.slice(0, credentials.maxItems)
      : mappedRows
  const items = rowsToItems(cappedRows, params.priority)
  const request = buildMailingRequest(items, params, credentials)
  const midVersion = credentials.midVersion ?? '0200'
  const validation = validateMailingRequest(request, midVersion)

  let xml: string | undefined
  if (validation.valid && validation.data) {
    stripEmptyDepositType(validation.data)
    xml = buildXml({ MailingRequest: validation.data })
  }

  return {
    itemCount: items.length,
    sourceItemCount,
    warnings,
    validation,
    xml,
  }
}

/**
 * OptiAddress: Excel → MailingCheck-only request (suggestions + optional rewritten addresses).
 * Same file naming as Mail ID (`MID_…_0RQ.XML`); do not combine with MailingCreate in one file.
 *
 * @param file Workbook bytes.
 * @param mapping Column mapping for the unstructured address blocks.
 * @param params Check parameters (reference and suggestion settings).
 * @param credentials Customer id, account id, optional MID version, and optional row cap.
 * @returns Same shape as `convertExcelToMailingRequest`, with MailingCheck XML when validation passed.
 */
export async function convertExcelToMailingCheck(
  file: Buffer | ArrayBuffer,
  mapping: ColumnMapping,
  params: BuildCheckParams,
  credentials: ConvertOptions,
): Promise<ConvertResult> {
  const { rows } = await parseExcelAddresses(file)
  const { rows: mappedRows, warnings } = mapRows(rows, mapping)
  const sourceItemCount = mappedRows.length
  const cappedRows =
    credentials.maxItems !== undefined && credentials.maxItems > 0
      ? mappedRows.slice(0, credentials.maxItems)
      : mappedRows
  const items = rowsToItems(cappedRows, params.priority)
  const request = buildMailingCheckRequest(items, params, credentials)
  const midVersion = credentials.midVersion ?? '0200'
  const validation = validateMailingRequest(request, midVersion)

  let xml: string | undefined
  if (validation.valid && validation.data) {
    stripEmptyDepositType(validation.data)
    xml = buildXml({ MailingRequest: validation.data })
  }

  return {
    itemCount: items.length,
    sourceItemCount,
    warnings,
    validation,
    xml,
  }
}

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

export interface ConvertOptions {
  customerId: string
  accountId: string
  midVersion?: MidProtocolVersion
  /** Cap number of mapped rows (e.g. 200 for Header mode=T — bpost test limit). */
  maxItems?: number
}

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
      delete action.depositIdentifierType
    }
  }
}

/**
 * End-to-end: Excel → mapped rows → MailingCreate → validated → XML.
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

import type { BatchRow } from '@/lib/kv/client'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

export interface CheckBatchParams {
  mailingRef: string
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  copyRequestItem: 'Y' | 'N'
  suggestionsCount: number
  suggestionsMinScore: number
  pdpInResponse: 'Y' | 'N'
  allRecordInResponse: 'Y' | 'N'
}

interface CheckBatchCredentials {
  username: string
  password: string
  customerNumber: string
  accountId: string
}

export interface CheckBatchResult {
  success: boolean
  mailingRef: string
  checkedCount: number
  okCount: number
  warningCount: number
  errorCount: number
  bpostResponse?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Builds a MailingCheck request from all batch rows and sends it to BPost OptiAddress.
 *
 * Unlike submitBatch (MailingCreate), this:
 * - Always sets genMID/genPSC to "N" (no barcodes for address check)
 * - Sends ALL rows (not just error-free ones) for full feedback
 * - Includes MailingCheck-specific attributes (suggestionsCount, etc.)
 *
 * Does NOT touch Redis or batch state — the caller handles that.
 * Catches BpostError and returns a structured error result.
 * Rethrows unexpected errors (network, etc.) for the caller to handle.
 */
export async function checkBatch(
  rows: BatchRow[],
  params: CheckBatchParams,
  credentials: CheckBatchCredentials,
): Promise<CheckBatchResult> {
  if (rows.length === 0) {
    throw new Error('No rows to check')
  }

  const customerNumber = Number(credentials.customerNumber)
  const accountId = Number(credentials.accountId)

  const items = rows.map((row) => {
    const mapped = row.mapped as Record<string, unknown>
    return {
      ...mapped,
      // Defensive fallback for legacy/inconsistent state; mapping flow should already normalize to NP/P.
      priority: mapped.priority ?? 'NP',
    }
  })

  const mailingRequest = {
    Context: {
      requestName: 'MailingRequest' as const,
      dataset: 'M037_MID' as const,
      sender: customerNumber,
      receiver: 'MID' as const,
      version: '0200' as const,
    },
    Header: {
      customerId: customerNumber,
      accountId,
      mode: params.mode,
      Files: {
        RequestProps: {
          customerFileRef: params.customerFileRef,
        },
      },
    },
    MailingCheck: [
      {
        seq: 1,
        mailingRef: params.mailingRef,
        genMID: 'N' as const,
        genPSC: 'N' as const,
        copyRequestItem: params.copyRequestItem,
        suggestionsCount: params.suggestionsCount,
        suggestionsMinScore: params.suggestionsMinScore,
        pdpInResponse: params.pdpInResponse,
        allRecordInResponse: params.allRecordInResponse,
        Items: { Item: items },
        ItemCount: { value: rows.length },
      },
    ],
  }

  const xml = buildXml({ MailingRequest: mailingRequest })
  const client = createBpostClient(credentials)

  try {
    const bpostResponse = await client.sendMailingRequest(xml)

    // Parse response for counts
    const response = bpostResponse as Record<string, unknown>
    const mailingCheck = (
      (response.MailingResponse as Record<string, unknown>)?.MailingCheck as Array<Record<string, unknown>>
    )?.[0]
    const replies = mailingCheck?.Replies as Record<string, unknown> | undefined
    const replyArray = (replies?.Reply as Array<Record<string, unknown>>) ?? []

    let okCount = 0
    let warningCount = 0
    let errorCount = 0

    for (const reply of replyArray) {
      const status = (reply.Status as Record<string, unknown>)?.code as string
      if (status === 'OK') okCount++
      else if (status === 'WARNING') warningCount++
      else if (status === 'ERROR') errorCount++
    }

    return {
      success: true,
      mailingRef: params.mailingRef,
      checkedCount: rows.length,
      okCount,
      warningCount,
      errorCount,
      bpostResponse,
    }
  } catch (err) {
    if (err instanceof BpostError) {
      return {
        success: false,
        mailingRef: params.mailingRef,
        checkedCount: 0,
        okCount: 0,
        warningCount: 0,
        errorCount: 0,
        error: {
          code: err.code,
          message: err.message,
          retryable: err.isRetryable,
        },
      }
    }
    throw err
  }
}
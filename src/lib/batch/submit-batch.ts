import type { BatchRow } from '@/lib/kv/client'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

export interface SubmitBatchParams {
  mailingRef: string
  expectedDeliveryDate: string
  format: 'Large' | 'Small'
  priority: 'P' | 'NP'
  mode: 'P' | 'T' | 'C'
  customerFileRef: string
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
}

interface SubmitBatchCredentials {
  username: string
  password: string
  customerNumber: string
  accountId: string
}

export interface SubmitBatchResult {
  success: boolean
  mailingRef: string
  submittedCount: number
  bpostResponse?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

/**
 * Builds a MailingCreate request from batch rows and sends it to BPost.
 *
 * Does NOT touch Redis or batch state — the caller handles that.
 * Catches BpostError and returns a structured error result.
 * Rethrows unexpected errors (network, etc.) for the caller to handle.
 */
export async function submitBatch(
  rows: BatchRow[],
  params: SubmitBatchParams,
  credentials: SubmitBatchCredentials,
): Promise<SubmitBatchResult> {
  if (rows.length === 0) {
    throw new Error('No rows to submit')
  }

  const customerNumber = Number(credentials.customerNumber)
  const accountId = Number(credentials.accountId)

  const items = rows.map((row) => {
    const mapped = row.mapped as Record<string, unknown>
    return {
      ...mapped,
      // Defensive fallback for legacy/inconsistent state; mapping flow should already normalize to NP/P.
      priority: mapped.priority ?? params.priority,
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
    MailingCreate: [
      {
        seq: 1,
        mailingRef: params.mailingRef,
        expectedDeliveryDate: params.expectedDeliveryDate,
        genMID: params.genMID,
        genPSC: params.genPSC,
        FileInfo: { type: 'MID2' as const },
        Format: { value: params.format },
        Items: { Item: items },
        ItemCount: { value: rows.length },
      },
    ],
  }

  const xml = buildXml({ MailingRequest: mailingRequest })
  const client = createBpostClient(credentials)

  try {
    const bpostResponse = await client.sendMailingRequest(xml)
    return {
      success: true,
      mailingRef: params.mailingRef,
      submittedCount: rows.length,
      bpostResponse,
    }
  } catch (err) {
    if (err instanceof BpostError) {
      return {
        success: false,
        mailingRef: params.mailingRef,
        submittedCount: 0,
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
// src/core/masspost/transport/http.ts
import { createBpostClient } from '@/client/bpost'
import { buildXml } from '@/lib/xml'
import type { MailingRequest } from '@/schemas/mailing-request'
import type { HttpCredentials } from '../credentials'

/** Sends an already-validated MailingRequest to bpost over HTTPS (reuses src/client/bpost.ts). */
export async function sendMailingRequestViaHttp(
  request: MailingRequest,
  credentials: HttpCredentials,
): Promise<Record<string, unknown>> {
  const xml = buildXml({ MailingRequest: request })
  const client = createBpostClient(credentials)
  return client.sendMailingRequest(xml)
}

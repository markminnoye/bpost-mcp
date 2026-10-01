// src/core/masspost/transport/http.ts
import { createBpostClient } from '@/client/bpost'
import { buildXml } from '@/lib/xml'
import type { MailingRequest } from '@/schemas/mailing-request'
import type { HttpCredentials } from '../credentials'

/** Sends an already-validated MailingRequest to bpost over HTTPS (reuses src/client/bpost.ts).
 *
 * @param request Validated mailing request.
 * @param credentials HTTP login and customer ids.
 * @returns Parsed response body from the HTTP client.
 */
export async function sendMailingRequestViaHttp(
  request: MailingRequest,
  credentials: HttpCredentials,
): Promise<Record<string, unknown>> {
  const xml = buildXml({ MailingRequest: request })
  const client = createBpostClient(credentials)
  return client.sendMailingRequest(xml)
}

/** bpost MailingRequest file name: MID_VVVV_CCCCCCCC_NNNNNNNNNN_YYMMDDHHMMSS_0RQ.XML */

export function formatBpostFileTimestamp(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    pad(date.getFullYear() % 100) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  )
}

function sanitizeFileToken(raw: string, maxLen: number): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, maxLen)
}

/** NNNNNNNNNN segment: exactly 10 uppercase alphanumerics (Technical Guide + deposit XSD). */
export function normalizeBpostCustomerFileRef(raw: string): string {
  const token = sanitizeFileToken(raw, 10)
  if (!token) throw new Error('customerFileRef levert geen geldige bpost-token op')
  return token.padEnd(10, '0')
}

/** CCCCCCCC segment: numeric PRS-id, up to 8 digits (leading zeros allowed). */
export function normalizeBpostSenderId(raw: string): string {
  const digits = String(raw).replace(/\D/g, '').slice(0, 8)
  if (!digits) throw new Error('senderId levert geen geldige bpost-token op')
  return digits
}

export function buildMailingRequestFileName(options: {
  /** PRS-ID / sender id (max 8), must match Context/@sender in the XML. */
  senderId: string
  /** Header Files/RequestProps customerFileRef (max 10). */
  customerFileRef: string
  /** MID schema version in Context, default 0100 (match bpost-assigned version). */
  version?: string
  generatedAt?: Date
}): string {
  const version = sanitizeFileToken(options.version ?? '0100', 4)
  const sender = normalizeBpostSenderId(options.senderId)
  const fileRef = normalizeBpostCustomerFileRef(options.customerFileRef)

  const ts = formatBpostFileTimestamp(options.generatedAt ?? new Date())
  return `MID_${version}_${sender}_${fileRef}_${ts}_0RQ.XML`
}

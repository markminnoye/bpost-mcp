import { parseXml } from '@/lib/xml'

/** One message from a MailingResponse `Replies` block. */
export interface MailingResponseMessage {
  code: string
  severity: string
  description?: string
}

/** Reads file-level Replies from a MailingResponse (2RS) XML string.
 *
 * @param xml Response XML.
 * @returns Messages that have a code. Missing reply blocks yield an empty array.
 */
export function extractMailingResponseMessages(xml: string): MailingResponseMessage[] {
  const doc = parseXml<Record<string, unknown>>(xml)
  const root = (doc.MailingResponse ?? doc) as Record<string, unknown>
  const replies = root.Replies as Record<string, unknown> | undefined
  if (!replies?.Reply) return []

  const replyList = Array.isArray(replies.Reply) ? replies.Reply : [replies.Reply]
  const messages: MailingResponseMessage[] = []

  for (const reply of replyList) {
    const r = reply as Record<string, unknown>
    const msgBlock = r.Messages as Record<string, unknown> | undefined
    if (!msgBlock?.Message) continue
    const msgList = Array.isArray(msgBlock.Message) ? msgBlock.Message : [msgBlock.Message]
    for (const msg of msgList) {
      const m = msg as Record<string, unknown>
      const code = String(m['@_code'] ?? m.code ?? '')
      const severity = String(m['@_severity'] ?? m.severity ?? '')
      const description =
        typeof m.Description === 'string'
          ? m.Description
          : typeof (m as { description?: string }).description === 'string'
            ? (m as { description: string }).description
            : undefined
      if (code) messages.push({ code, severity, description })
    }
  }
  return messages
}

/**
 * Reports whether any file-level message has severity `FATAL`.
 *
 * @param xml Response XML.
 * @returns `true` when `extractMailingResponseMessages` finds a fatal message.
 */
export function hasFatalMailingResponse(xml: string): boolean {
  return extractMailingResponseMessages(xml).some((m) => m.severity === 'FATAL')
}

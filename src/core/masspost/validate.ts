// src/core/masspost/validate.ts
import { z } from 'zod'
import {
  MailingRequestSchema,
  MailingCreateSchema,
  type MailingRequest,
} from '@/schemas/mailing-request'
import type { MidProtocolVersion } from './credentials'
import { findUnsupportedChars } from './charset'

const mailingRequestWithActionRefine = (schema: z.ZodType<MailingRequest>) =>
  schema.refine(
    (data) =>
      [data.MailingCreate, data.MailingCheck, data.MailingDelete, data.MailingReuse].some(
        (arr) => arr !== undefined && arr.length > 0,
      ),
    { message: 'At least one mailing action (Create/Check/Delete/Reuse) is required' },
  )

/** XSD in repo is 0200-shaped; Contrapunt uses 0100 — no expectedDeliveryDate, no FileInfo on MailingCreate. */
export function mailingRequestSchemaForVersion(midVersion: MidProtocolVersion = '0100') {
  if (midVersion === '0200') return MailingRequestSchema
  const createSchema = MailingCreateSchema.omit({
    expectedDeliveryDate: true,
    FileInfo: true,
  })
  return mailingRequestWithActionRefine(
    MailingRequestSchema.safeExtend({
      // narrower create schema (0100/0102 omit 0200-only fields); safeExtend's type can't express that
      MailingCreate: z.array(createSchema).optional() as never,
    }) as z.ZodType<MailingRequest>,
  )
}

export interface ValidationIssue {
  path: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  data?: MailingRequest
  issues: ValidationIssue[]
}

/** Every string leaf that contains a character bpost (ISO-8859-1) would not accept. */
function findCharsetIssues(value: unknown, path: string[] = []): ValidationIssue[] {
  if (typeof value === 'string') {
    const bad = findUnsupportedChars(value)
    return bad.length
      ? [
          {
            path: path.join('.'),
            message: `Bevat teken(s) die bpost niet aanvaardt (enkel ISO-8859-1): ${bad.join(' ')}`,
          },
        ]
      : []
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => findCharsetIssues(v, [...path, String(i)]))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => findCharsetIssues(v, [...path, k]))
  }
  return []
}

/** Validates a candidate MailingRequest object against the same Zod schema (XSD-derived
 *  field lengths, patterns, enums) used to build outgoing requests elsewhere in this repo. */
export function validateMailingRequest(
  candidate: unknown,
  midVersion: MidProtocolVersion = '0100',
): ValidationResult {
  const result = mailingRequestSchemaForVersion(midVersion).safeParse(candidate)
  if (result.success) {
    // The XML is written as latin1 bytes; characters outside ISO-8859-1 would be corrupted silently.
    const charsetIssues = findCharsetIssues(result.data)
    if (charsetIssues.length) return { valid: false, issues: charsetIssues }
    return { valid: true, data: result.data, issues: [] }
  }
  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
  return { valid: false, issues }
}

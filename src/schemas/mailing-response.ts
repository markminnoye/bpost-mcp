// src/schemas/mailing-response.ts
import { z } from 'zod'
import { StatusSchema, CustomerRefsSchema, RepliesSchema } from './common'

// ── Context ───────────────────────────────────────────────────────────────────

export const MailingContextResponseSchema = z.object({
  requestName: z.literal('MailingResponse'),
  dataset: z.literal('M037_MID'),
  sender: z.literal('MID'),
  receiver: z.number().int().positive(),
  version: z.literal('0100'),
})

// ── Header ────────────────────────────────────────────────────────────────────

export const MailingResponseHeaderSchema = z.object({
  customerId: z.number().int().positive(),
  CustomerRefs: CustomerRefsSchema.optional(),
  Files: z.object({
    RequestProps: z.object({
      fileName: z.string().max(100),
      customerFileRef: z.string().max(10),
    }),
  }).optional(),
})

// ── Action response types ─────────────────────────────────────────────────────

/** Base type used by MailingDelete and MailingReuse responses */
const MailingListTypeSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().max(20),
  Status: StatusSchema,
  CustomerRefs: CustomerRefsSchema.optional(),
  Replies: RepliesSchema.optional(),
})

/** MailingCreate response — same as base */
export const MailingCreateResponseSchema = MailingListTypeSchema

/** MailingCheck response — base + optional DistributionInformation (Phase 2 detail deferred) */
export const MailingCheckResponseSchema = MailingListTypeSchema.extend({
  DistributionInformation: z.object({
    Item: z.array(z.object({
      seq: z.number().int().positive(),
      distributionOffice: z.string().max(250),
    }).passthrough()).optional(),
  }).optional(),
})

export const MailingDeleteResponseSchema = MailingListTypeSchema
export const MailingReuseResponseSchema = MailingListTypeSchema

// ── Root schema ───────────────────────────────────────────────────────────────

export const MailingResponseSchema = z.object({
  Context: MailingContextResponseSchema,
  Header: MailingResponseHeaderSchema,
  Replies: RepliesSchema.optional(),
  MailingCreate: z.array(MailingCreateResponseSchema).optional(),
  MailingCheck: z.array(MailingCheckResponseSchema).optional(),
  MailingDelete: z.array(MailingDeleteResponseSchema).optional(),
  MailingReuse: z.array(MailingReuseResponseSchema).optional(),
})

export type MailingResponse = z.infer<typeof MailingResponseSchema>
export type MailingCreateResponse = z.infer<typeof MailingCreateResponseSchema>
export type MailingCheckResponse = z.infer<typeof MailingCheckResponseSchema>

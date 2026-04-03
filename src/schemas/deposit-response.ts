// src/schemas/deposit-response.ts
import { z } from 'zod'
import { StatusSchema, CustomerRefsSchema, RepliesSchema } from './common'

// ── Context ───────────────────────────────────────────────────────────────────

export const DepositContextResponseSchema = z.object({
  requestName: z.literal('DepositResponse'),
  dataset: z.literal('M004_MPA'),
  sender: z.literal('EMP'),
  receiver: z.number().int().positive(),
  version: z.literal('0100'),
})

// ── Header ────────────────────────────────────────────────────────────────────

export const DepositResponseHeaderSchema = z.object({
  customerId: z.number().int().positive(),
  CustomerRefs: CustomerRefsSchema.optional(),
  Files: z.object({
    RequestProps: z.object({
      fileName: z.string().max(100),
      customerFileRef: z.string().length(10),
    }),
  }),
})

// ── Action response type (DepositType in response XSD) ───────────────────────

export const DepositResponseActionSchema = z.object({
  seq: z.number().int().positive(),
  depositIdentifier: z.string().max(20).optional(),
  depositIdentifierType: z.enum(['depositRef', 'tmpDepositNr']).optional(),
  Status: StatusSchema,
  CustomerRefs: CustomerRefsSchema.optional(),
  Replies: RepliesSchema.optional(),
})

// ── Root schema ───────────────────────────────────────────────────────────────

export const DepositResponseSchema = z.object({
  Context: DepositContextResponseSchema,
  Header: DepositResponseHeaderSchema,
  Replies: RepliesSchema.optional(),
  DepositCreate: z.array(DepositResponseActionSchema).optional(),
  DepositUpdate: z.array(DepositResponseActionSchema).optional(),
  DepositDelete: z.array(DepositResponseActionSchema).optional(),
  DepositValidate: z.array(DepositResponseActionSchema).optional(),
})

export type DepositResponse = z.infer<typeof DepositResponseSchema>
export type DepositResponseAction = z.infer<typeof DepositResponseActionSchema>

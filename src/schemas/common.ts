// src/schemas/common.ts
import { z } from 'zod'

/** XSD BooleanType: Y | N */
export const BooleanTypeSchema = z.enum(['Y', 'N'])
export type BooleanType = z.infer<typeof BooleanTypeSchema>

/** XSD Context attributes — fixed values validated at parse time */
export const ContextSchema = z.object({
  requestName: z.enum(['DepositRequest', 'MailingRequest']),
  dataset: z.literal('M004_MPA'),
  sender: z.number().int().positive(),
  receiver: z.literal('EMP'),
  version: z.literal('0100'),
})
export type Context = z.infer<typeof ContextSchema>

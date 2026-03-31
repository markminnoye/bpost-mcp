// src/schemas/common.ts
import { z } from 'zod'

/** XSD BooleanType: Y | N */
export const BooleanTypeSchema = z.enum(['Y', 'N'])
export type BooleanType = z.infer<typeof BooleanTypeSchema>

/** Context attributes for DepositRequest */
export const DepositContextSchema = z.object({
  requestName: z.literal('DepositRequest'),
  dataset: z.literal('M004_MPA'),
  sender: z.number().int().positive(),
  receiver: z.literal('EMP'),
  version: z.literal('0100'),
})
export type DepositContext = z.infer<typeof DepositContextSchema>

/** Context attributes for MailingRequest */
export const MailingContextSchema = z.object({
  requestName: z.literal('MailingRequest'),
  dataset: z.literal('M037_MID'),
  sender: z.number().int().positive(),
  receiver: z.literal('MID'),
  version: z.literal('0200'),
})
export type MailingContext = z.infer<typeof MailingContextSchema>

/** Union of both context types (for shared use) */
export const ContextSchema = z.union([DepositContextSchema, MailingContextSchema])
export type Context = z.infer<typeof ContextSchema>

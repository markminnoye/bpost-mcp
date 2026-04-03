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

/** Customer reference key-value pair (XSD: key/value max 250, min 1) */
export const CustomerRefSchema = z.object({
  key: z.string().min(1).max(250),
  value: z.string().min(1).max(250),
})
export type CustomerRef = z.infer<typeof CustomerRefSchema>

export const CustomerRefsSchema = z.object({
  CustomerRef: z.array(CustomerRefSchema).min(1),
})
export type CustomerRefs = z.infer<typeof CustomerRefsSchema>

// ── Shared response building blocks ──────────────────────────────────────────

/** XSD StatusType: code attribute (max 10) */
export const StatusSchema = z.object({
  code: z.string().max(10),
})
export type Status = z.infer<typeof StatusSchema>

/** XSD LocationsType > Location */
export const LocationSchema = z.object({
  tagName: z.string().max(50),
  attributeName: z.string().max(50).optional(),
  attributeValue: z.string().max(50).optional(),
})

/** XSD MessageContent (KeyValueAttGroup) */
export const MessageContentSchema = z.object({
  key: z.string().max(250),
  value: z.string().max(250),
})

/** XSD Message element inside RepliesType */
export const MessageSchema = z.object({
  code: z.string().max(10),
  severity: z.enum(['FATAL', 'ERROR', 'WARN', 'INFO']),
  Description: z.string().optional(),
  MessageContents: z.object({
    MessageContent: z.array(MessageContentSchema).min(1),
  }).optional(),
})

/** XSD ReplyType */
export const ReplySchema = z.object({
  seq: z.number().int().positive(),
  XPath: z.string(),
  Locations: z.object({
    Location: z.array(LocationSchema).min(1),
  }).optional(),
  Messages: z.object({
    Message: z.array(MessageSchema).min(1),
  }),
})

/** XSD RepliesType */
export const RepliesSchema = z.object({
  Reply: z.array(ReplySchema).min(1),
})
export type Replies = z.infer<typeof RepliesSchema>

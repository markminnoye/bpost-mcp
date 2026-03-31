// src/schemas/mailing-request.ts
import { z } from 'zod'
import { MailingContextSchema } from './common'

const RequestPropsSchema = z.object({
  filename: z.string().optional(),
}).passthrough()

const ResponsePropsSchema = z.object({
  filename: z.string().optional(),
}).passthrough()

const HeaderSchema = z.object({
  Files: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema,
  }),
  CustomerRefs: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema,
  }).optional(),
})

// XSD action elements: MailingCreate, MailingCheck, MailingDelete, MailingReuse
const MailingCreateSchema = z.object({}).passthrough()
const MailingCheckSchema = z.object({}).passthrough()
const MailingDeleteSchema = z.object({}).passthrough()
const MailingReuseSchema = z.object({}).passthrough()

export const MailingRequestSchema = z.object({
  Context: MailingContextSchema,
  Header: HeaderSchema,
  MailingCreate: z.array(MailingCreateSchema).optional(),
  MailingCheck: z.array(MailingCheckSchema).optional(),
  MailingDelete: z.array(MailingDeleteSchema).optional(),
  MailingReuse: z.array(MailingReuseSchema).optional(),
}).refine(
  (data) => [data.MailingCreate, data.MailingCheck, data.MailingDelete, data.MailingReuse]
    .some((arr) => arr !== undefined && arr.length > 0),
  { message: 'At least one mailing action (Create/Check/Delete/Reuse) is required' }
)

export type MailingRequest = z.infer<typeof MailingRequestSchema>

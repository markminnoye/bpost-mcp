// src/schemas/deposit-request.ts
import { z } from 'zod'
import { ContextSchema } from './common'

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

const DepositCreateSchema = z.object({}).passthrough()
const DepositUpdateSchema = z.object({}).passthrough()
const DepositDeleteSchema = z.object({}).passthrough()
const DepositValidateSchema = z.object({}).passthrough()

export const DepositRequestSchema = z.object({
  Context: ContextSchema,
  Header: HeaderSchema,
  DepositCreate: z.array(DepositCreateSchema).optional(),
  DepositUpdate: z.array(DepositUpdateSchema).optional(),
  DepositDelete: z.array(DepositDeleteSchema).optional(),
  DepositValidate: z.array(DepositValidateSchema).optional(),
}).refine(
  (data) => [data.DepositCreate, data.DepositUpdate, data.DepositDelete, data.DepositValidate]
    .some((arr) => arr !== undefined && arr.length > 0),
  { message: 'At least one deposit action (Create/Update/Delete/Validate) is required' }
)

export type DepositRequest = z.infer<typeof DepositRequestSchema>

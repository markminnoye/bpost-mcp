// src/schemas/deposit-request.ts
import { z } from 'zod'
import { DepositContextSchema, CustomerRefSchema, CustomerRefsSchema, BooleanTypeSchema } from './common'

// ── Header ────────────────────────────────────────────────────────────────────

const RequestPropsSchema = z.object({
  /** XSD: length=10, pattern=[A-Z\d]{10} */
  customerFileRef: z.string().regex(/^[A-Z\d]{10}$/),
})

const ResponsePropsSchema = z.object({
  format: z.enum(['XML', 'TXT']).optional(),
  compressed: BooleanTypeSchema.optional(),
  encrypted: BooleanTypeSchema.optional(),
  transmissionMode: z.enum(['HTTP', 'HTTPS', 'FTP', 'FTPS']).optional(),
})

const HeaderSchema = z.object({
  customerId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  mode: z.enum(['T', 'C', 'P']),
  Files: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema.optional(),
  }),
  CustomerRefs: CustomerRefsSchema.optional(),
})

// ── Shared deposit sub-types ──────────────────────────────────────────────────

const ContactSchema = z.object({
  seq: z.number().int().positive(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().min(6).max(100),
  lang: z.enum(['nl', 'fr']),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
})

const ContactsSchema = z.object({
  Contact: z.array(ContactSchema).min(1),
})

const CharacteristicSchema = z.object({
  key: z.literal('annexType'),
  value: z.string().min(1).max(250),
})

const QuantitySchema = z.object({
  unit: z.enum(['PCE', 'g/PCE']),
  value: z.string().min(1).max(250),
})

const PrepaymentSchema = z.object({
  key: z.literal('meteringPrice'),
  value: z.string().min(1).max(250),
})

const DepositItemSchema = z.object({
  seq: z.number().int().positive(),
  Characteristics: z.object({
    Characteristic: z.array(CharacteristicSchema).min(1),
  }).optional(),
  Quantities: z.object({
    Quantity: z.array(QuantitySchema).min(1),
  }),
  Prepayments: z.object({
    Prepayment: z.array(PrepaymentSchema).min(1),
  }).optional(),
})

const DistributionSchema = z.object({
  region: z.enum(['AX', 'BX', 'CX', 'LX', 'GX']),
  volume: z.number().min(0).max(100),
})

const OptionQuantitySchema = z.object({
  unit: z.literal('PCE'),
  value: z.string().min(1).max(250),
})

const OptionSchema = z.object({
  id: z.number().int().positive(),
  OptionQuantities: z.object({
    OptionQuantity: z.array(OptionQuantitySchema).min(1),
  }),
})

const SenderSchema = z.object({
  name: z.string(),
  trNumber: z.string(),
  brandName: z.string(),
})

/** DepositType (used by DepositCreate) */
const DepositTypeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  modelName: z.string().max(70),
  modelPortalUserName: z.string().min(1).max(30),
  invoiceRef: z.string().min(1).max(30),
  meteringNumber: z.string().min(1).max(60),
  router: z.string().min(1).max(200).optional(),
  formByMail: BooleanTypeSchema.optional().default('N'),
  autoValidate: BooleanTypeSchema.optional().default('N'),
  description: z.string().max(200).optional(),
  Items: z.object({
    Item: z.array(DepositItemSchema).min(1),
  }),
  ItemCount: z.object({ value: z.number().int().positive() }),
  Distributions: z.object({
    Distribution: z.array(DistributionSchema).min(1),
  }).optional(),
  Options: z.object({
    Option: z.array(OptionSchema).min(1),
  }).optional(),
  Sender: SenderSchema.optional(),
})

/** DepositType2 (used by DepositUpdate — meteringNumber is optional) */
const DepositType2Schema = DepositTypeSchema.extend({
  meteringNumber: z.string().min(1).max(60).optional(),
})

// ── Deposit identifier attribute groups ──────────────────────────────────────

/** For Create: depositIdentifier optional */
const DepositIdentifierCreateSchema = z.object({
  depositIdentifier: z.string().min(1).max(20).optional(),
  depositIdentifierType: z.literal('depositRef').optional(),
})

/** For Update/Delete/Validate: depositIdentifier required */
const DepositIdentifierUpdateSchema = z.object({
  depositIdentifier: z.string().min(1).max(20),
  depositIdentifierType: z.enum(['depositRef', 'tmpDepositNr']).optional().default('depositRef'),
})

// ── Action schemas ────────────────────────────────────────────────────────────

/** DepositCreate — extends DepositCreateUpdateType + DepositIdentifierCreateAttGrp */
export const DepositCreateSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20).optional(),
  Contacts: ContactsSchema.optional(),
  CustomerRefs: CustomerRefsSchema.optional(),
  Contract: z.object({
    billTo: z.number().int().positive(),
    invoiceGrouping: z.string().min(1).max(70).optional(),
    depositor: z.number().int().positive().optional(),
  }),
  Deposit: DepositTypeSchema,
}).merge(DepositIdentifierCreateSchema)

/** DepositUpdate — extends DepositCreateUpdateType2 + DepositIdentifierCreateAttGrp */
export const DepositUpdateSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20).optional(),
  Contacts: ContactsSchema.optional(),
  CustomerRefs: CustomerRefsSchema.optional(),
  Contract: z.object({
    billTo: z.number().int().positive(),
    invoiceGrouping: z.string().min(1).max(70).optional(),
    depositor: z.number().int().positive().optional(),
  }),
  Deposit: DepositType2Schema,
}).merge(DepositIdentifierCreateSchema)

/** DepositDelete — extends DepositDeleteValidateType + DepositIdentifierUpdateDeleteValidateAttGrp */
export const DepositDeleteSchema = z.object({
  seq: z.number().int().positive(),
  Contacts: ContactsSchema.optional(),
  CustomerRefs: CustomerRefsSchema.optional(),
}).merge(DepositIdentifierUpdateSchema)

/** DepositValidate — same shape as DepositDelete */
export const DepositValidateSchema = DepositDeleteSchema

// ── Root schema ───────────────────────────────────────────────────────────────

export const DepositRequestSchema = z.object({
  Context: DepositContextSchema,
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
export type DepositCreate = z.infer<typeof DepositCreateSchema>
export type DepositUpdate = z.infer<typeof DepositUpdateSchema>
export type DepositDelete = z.infer<typeof DepositDeleteSchema>
export type DepositValidate = z.infer<typeof DepositValidateSchema>

// Re-export CustomerRef for use in other files
export { CustomerRefSchema }

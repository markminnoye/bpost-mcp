// src/schemas/mailing-request.ts
import { z } from 'zod'
import { MailingContextSchema, CustomerRefsSchema, BooleanTypeSchema } from './common'

// ── Header ────────────────────────────────────────────────────────────────────

const RequestPropsSchema = z.object({
  /** XSD: minLength=1 (within StringType10) */
  customerFileRef: z.string().min(1).max(10),
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
  mode: z.enum(['P', 'T', 'C']),
  Files: z.object({
    RequestProps: RequestPropsSchema,
    ResponseProps: ResponsePropsSchema.optional(),
  }),
  CustomerRefs: CustomerRefsSchema.optional(),
})

// ── Shared mailing sub-types ──────────────────────────────────────────────────

const ContactSchema = z.object({
  seq: z.number().int().positive(),
  firstName: z.string().max(50).optional(),
  lastName: z.string().max(50).optional(),
  email: z.string().min(1).max(100),
  lang: z.enum(['fr', 'nl', 'de']),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
})

const ContactsSchema = z.object({
  Contact: z.array(ContactSchema).min(1),
})

/** XSD: code enumerated 1–19, 70–79, 90–93 */
const CompCodeSchema = z.enum([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
  '90', '91', '92', '93',
])

const CompSchema = z.object({
  code: CompCodeSchema,
  value: z.string().max(70).optional(),
})

/** XSD MidNumberType: pattern [0-9]{14,18} */
const MidNumberSchema = z.string().regex(/^[0-9]{14,18}$/)

/** XSD GenMidType: N | 7 | 9 | 11 */
const GenMidTypeSchema = z.enum(['N', '7', '9', '11'])

const ItemSchema = z.object({
  seq: z.number().int().positive(),
  lang: z.enum(['fr', 'nl', 'de']).optional(),
  midNum: MidNumberSchema.optional(),
  psCode: z.string().max(20).optional(),
  priority: z.enum(['P', 'NP']),
  Comps: z.object({
    Comp: z.array(CompSchema).min(1),
  }),
})

const CustomerInfoGroup = z.object({
  Contacts: ContactsSchema.optional(),
  CustomerRefs: CustomerRefsSchema.optional(),
})

const ItemsGroup = z.object({
  Items: z.object({
    Item: z.array(ItemSchema).min(1),
  }),
  ItemCount: z.object({ value: z.number().int().positive() }),
})

// ── Deposit identifier attribute groups (for Mailing) ────────────────────────

const DepositIdOptional = z.object({
  depositIdentifier: z.string().min(1).max(20).optional(),
  depositIdentifierType: z.enum(['depositRef', 'tmpDepositNr']).optional().default('depositRef'),
})

const DepositIdRequired = z.object({
  depositIdentifier: z.string().min(1).max(20),
  depositIdentifierType: z.enum(['depositRef', 'tmpDepositNr']).optional().default('depositRef'),
})

// ── Action schemas ────────────────────────────────────────────────────────────

/** MailingCreate — CreateMailingListType + MailingIdentifierAttributeGroup + DepositIdOptional + GenerateValues */
export const MailingCreateSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genMID: GenMidTypeSchema.optional().default('N'),
  genPSC: BooleanTypeSchema.optional().default('N'),
  FileInfo: z.object({ type: z.string() }),
  Format: z.object({
    value: z.enum(['Large', 'Small']),
    responseSortingMode: z.enum(['PO', 'CU']).optional(),
  }),
  PresortingCodeFile: z.string().max(100).optional(),
  PresortingCodeVersion: z.object({ version: z.number().int().positive() }).optional(),
})
  .merge(CustomerInfoGroup)
  .merge(ItemsGroup)
  .merge(DepositIdOptional)

/** MailingCheck — CheckMailingListType + additional attributes */
export const MailingCheckSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20),
  genMID: GenMidTypeSchema.optional().default('N'),
  genPSC: BooleanTypeSchema.optional().default('N'),
  depositIdentifier: z.string().min(1).max(20).optional(),
  depositIdentifierType: z.enum(['depositRef', 'tmpDepositNr']).optional().default('depositRef'),
  copyRequestItem: BooleanTypeSchema.optional().default('N'),
  suggestionsCount: z.number().int().min(0).optional().default(0),
  suggestionsMinScore: z.number().int().min(1).max(100).optional().default(95),
  pdpInResponse: BooleanTypeSchema.optional().default('N'),
  allRecordInResponse: BooleanTypeSchema.optional().default('N'),
})
  .merge(CustomerInfoGroup)
  .merge(ItemsGroup)

/** MailingDelete — DeleteMailingListType */
export const MailingDeleteSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20),
})
  .merge(CustomerInfoGroup)

/** MailingReuse — MailingReuseType */
export const MailingReuseSchema = z.object({
  seq: z.number().int().positive(),
  mailingRef: z.string().min(1).max(20),
  sourceMailingRef: z.string().min(1).max(20),
})
  .merge(CustomerInfoGroup)
  .merge(DepositIdRequired)

// ── Root schema ───────────────────────────────────────────────────────────────

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
export type MailingCreate = z.infer<typeof MailingCreateSchema>
export type MailingCheck = z.infer<typeof MailingCheckSchema>
export type MailingDelete = z.infer<typeof MailingDeleteSchema>
export type MailingReuse = z.infer<typeof MailingReuseSchema>

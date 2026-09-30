import { z } from 'zod'

/**
 * `POST /api/batches/upload` multipart body.
 * Describes the handler. The route still reads `formData` itself, so error text is unchanged.
 */
export const UploadBatchRequestSchema = z
  .object({
    file: z.string().meta({
      description: 'CSV upload. Form field name is `file`.',
      format: 'binary',
    }),
  })
  .meta({ id: 'UploadBatchRequest' })

/** 201 body after the CSV is stored. */
export const UploadBatchCreatedSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    batchId: z.string(),
    status: z.string(),
    totalRows: z.number().int(),
    nextStep: z.string(),
  })
  .meta({ id: 'UploadBatchCreated' })

/** Error JSON for 400, 401, 403, 413, and 500. `details` is only set on 500. */
export const UploadBatchErrorSchema = z
  .object({
    error: z.string(),
    details: z.string().optional(),
  })
  .meta({ id: 'UploadBatchError' })

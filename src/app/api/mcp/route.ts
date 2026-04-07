// src/app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema, ItemSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { resolveTenant } from '@/lib/tenant/resolve'
import { extractBearerToken } from '@/lib/auth/extract-token'
import { z } from 'zod'
import { getBatchState, saveBatchState } from '@/lib/kv/client'
export const dynamic = 'force-dynamic'

interface BpostCredentials {
  username: string
  password: string
  customerNumber: string
  accountId: string
}

function createServer(tenantId: string, credentials: BpostCredentials): McpServer {
  const server = new McpServer({
    name: 'bpost-emasspost',
    version: '1.0.0',
  })

  server.registerTool('get_upload_instructions', {
    description: 'Returns the exact command to execute in your local terminal to securely upload an Excel or CSV file to the BPost MCP Service. Use this BEFORE attempting to validate a local file.',
    inputSchema: z.object({}),
  }, async () => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bpost.sonicrocket.io'
    const uploadUrl = `${baseUrl}/api/batches/upload`
    return { content: [{ type: 'text', text: `To securely upload your file, execute the following command in your local terminal exactly as written. Ensure you substitute <YOUR_FILE.csv> and your Bearer token:\n\ncurl -X POST -F "file=@<YOUR_FILE.csv>" ${uploadUrl} -H "Authorization: Bearer <TOKEN>"\n\nAfter a successful upload, you will receive a batchId in the JSON response. Use the "get_raw_headers" tool with that batchId to continue.` }] }
  })

  server.registerTool(
    'get_raw_headers',
    {
      description: 'Fetch the raw CSV headers of a newly uploaded batch. Use to prepare semantic mapping rules before triaging errors.',
      inputSchema: z.object({ batchId: z.string() }),
    },
    async ({ batchId }) => {
      const state = await getBatchState(tenantId, batchId)
      if (!state) return { isError: true, content: [{ type: 'text', text: `Batch ${batchId} not found or expired.` }] }
      return { content: [{ type: 'text', text: JSON.stringify({ headers: state.headers, status: state.status, totalRows: state.rows.length }, null, 2) }] }
    }
  )

  server.registerTool(
    'apply_mapping_rules',
    {
      description: 'Applies mapping rules to transform raw CSV columns into BPost schema fields. Moves the batch from UNMAPPED to MAPPED.',
      inputSchema: z.object({ batchId: z.string(), mapping: z.record(z.string(), z.string()).describe('Format: { "Client Loc": "postalCode" }') }),
    },
    async ({ batchId, mapping }) => {
      const state = await getBatchState(tenantId, batchId)
      if (!state) return { isError: true, content: [{ type: 'text', text: 'Batch not found' }] }
      if (state.status !== 'UNMAPPED') return { isError: true, content: [{ type: 'text', text: 'Batch is already mapped. Use apply_row_fix to patch issues.' }] }

      const unknownCols = Object.keys(mapping).filter(col => !state.headers.includes(col))
      if (unknownCols.length > 0) {
        return { isError: true, content: [{ type: 'text', text: `Mapping references unknown source columns: ${unknownCols.join(', ')}. Available headers: ${state.headers.join(', ')}` }] }
      }

      // IMP-1: Validate that target field names in the mapping are known schema fields
      const knownFields = Object.keys(ItemSchema.shape)
      const unknownTargets = Object.values(mapping).filter(target => !knownFields.includes(target))
      if (unknownTargets.length > 0) {
        return { isError: true, content: [{ type: 'text', text: `Mapping references unknown target fields: ${unknownTargets.join(', ')}. Known fields: ${knownFields.join(', ')}` }] }
      }

      state.rows = state.rows.map(r => {
        const mapped: any = {}
        Object.entries(mapping).forEach(([sourceCol, targetCol]) => {
           mapped[targetCol] = r.raw[sourceCol]
        })
        const result = ItemSchema.safeParse(mapped)
        return {
          ...r,
          mapped: result.success ? result.data : mapped,
          validationErrors: result.success ? undefined : result.error.issues,
        }
      })
      state.status = 'MAPPED'
      await saveBatchState(state)
      
      return { content: [{ type: 'text', text: `Successfully mapped ${state.rows.length} rows.` }] }
    }
  )

  server.registerTool(
    'get_batch_errors',
    {
      description: 'Retrieves rows that failed Zod validation after mapping so you can trivially triage them with the user.',
      inputSchema: z.object({ batchId: z.string(), limit: z.number().int().min(1).default(10) }),
    },
    async ({ batchId, limit }) => {
      const state = await getBatchState(tenantId, batchId)
      if (!state) return { isError: true, content: [{ type: 'text', text: 'Batch not found' }] }
      
      const erroredRows = state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0)
      const sliced = erroredRows.slice(0, limit)
      return { content: [{ type: 'text', text: JSON.stringify({ totalErrors: erroredRows.length, visible: sliced.length, errors: sliced }, null, 2) }] }
    }
  )

  server.registerTool(
    'apply_row_fix',
    {
      description: 'Fixes a specific row using corrected payload data. Submits the surgical fix to the KV state cache.',
      inputSchema: z.object({ batchId: z.string(), rowIndex: z.number().int().min(0), correctedData: z.record(z.string(), z.any()) }),
    },
    async ({ batchId, rowIndex, correctedData }) => {
      const state = await getBatchState(tenantId, batchId)
      if (!state) return { isError: true, content: [{ type: 'text', text: 'Batch not found' }] }
      
      const row = state.rows.find(r => r.index === rowIndex)
      if (!row) return { isError: true, content: [{ type: 'text', text: 'Row not found' }] }
      
      row.mapped = { ...row.mapped, ...correctedData }

      // Re-validate the merged row
      const validationResult = ItemSchema.safeParse(row.mapped)
      if (validationResult.success) {
        row.mapped = validationResult.data
        row.validationErrors = undefined
        await saveBatchState(state)
        return { content: [{ type: 'text', text: `Row ${rowIndex} patched and validated successfully.` }] }
      } else {
        row.validationErrors = validationResult.error.issues
        await saveBatchState(state)
        return { content: [{ type: 'text', text: `Row ${rowIndex} patched but still has ${validationResult.error.issues.length} validation error(s). Use get_batch_errors to review.` }] }
      }
    }
  )

  server.registerTool(
    'submit_ready_batch',
    {
      description: 'Submits all successfully validated rows from the KV batch to the physical BPost e-MassPost service via our XML Client.',
      inputSchema: z.object({ batchId: z.string() }),
    },
    async ({ batchId }) => {
      const state = await getBatchState(tenantId, batchId)
      if (!state) return { isError: true, content: [{ type: 'text', text: 'Batch not found' }] }

      if (state.status === 'SUBMITTED') return { isError: true, content: [{ type: 'text', text: `Batch ${batchId} has already been submitted.` }] }
      if (state.status !== 'MAPPED') return { isError: true, content: [{ type: 'text', text: `Batch ${batchId} is not in MAPPED state. Current status: ${state.status}` }] }

      const readyRows = state.rows.filter(r => !r.validationErrors || r.validationErrors.length === 0)
      if (readyRows.length === 0) return { isError: true, content: [{ type: 'text', text: 'No physically ready rows to submit.' }] }

      // MVP Step: Mark as submitted. Next phase will pipe readyRows into MailingRequestSchema and hit BPost XML endpoint.
      state.status = 'SUBMITTED'
      await saveBatchState(state)

      return { content: [{ type: 'text', text: `[STUB] ${readyRows.length} rows are ready for submission. BPost XML dispatch is not yet implemented.` }] }
    }
  )

  server.registerTool(
    'bpost_announce_deposit',
    {
      description:
        'Announce a mail deposit to BPost e-MassPost. Accepts a validated DepositRequest payload ' +
        '(Create, Update, Delete, or Validate actions) and returns the BPost response.',
      inputSchema: DepositRequestSchema,
    },
    async (input) => {
      const client = createBpostClient(credentials)
      
      // Auto-populate Context and Header boilerplate
      const payload = {
        ...input,
        Context: {
          ...input.Context,
          sender: Number(credentials.customerNumber),
        },
        Header: {
          ...input.Header,
          customerId: Number(credentials.customerNumber),
          accountId: Number(credentials.accountId),
          mode: input.Header?.mode ?? 'T', // Default to Test mode if not specified
        }
      }

      const xml = buildXml({ DepositRequest: payload })
      try {
        const result = await client.sendDepositRequest(xml)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (err) {
        if (err instanceof BpostError) {
          return {
            content: [{ type: 'text', text: JSON.stringify(err.toMcpError(), null, 2) }],
            isError: true,
          }
        }
        throw err
      }
    },
  )

  server.registerTool(
    'bpost_announce_mailing',
    {
      description:
        'Announce a mailing batch to BPost e-MassPost. Accepts a MailingRequest payload and ' +
        'returns the BPost response or a structured error with the MPW/MID code.',
      inputSchema: MailingRequestSchema,
    },
    async (input) => {
      const client = createBpostClient(credentials)

      // Auto-populate Context and Header boilerplate
      const payload = {
        ...input,
        Context: {
          ...input.Context,
          sender: Number(credentials.customerNumber),
        },
        Header: {
          ...input.Header,
          customerId: Number(credentials.customerNumber),
          accountId: Number(credentials.accountId),
          mode: input.Header?.mode ?? 'T',
        }
      }

      const xml = buildXml({ MailingRequest: payload })
      try {
        const result = await client.sendMailingRequest(xml)
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      } catch (err) {
        if (err instanceof BpostError) {
          return {
            content: [{ type: 'text', text: JSON.stringify(err.toMcpError(), null, 2) }],
            isError: true,
          }
        }
        throw err
      }
    },
  )

  return server
}

export async function POST(req: Request): Promise<Response> {
  // 1. Extract bearer token
  const token = extractBearerToken(req)
  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Resolve tenant from token
  const tenant = await resolveTenant(token)
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Invalid or revoked token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Handle MCP request with tenant credentials
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const server = createServer(tenant.tenantId, { 
    username: tenant.bpostUsername, 
    password: tenant.bpostPassword,
    customerNumber: tenant.customerNumber,
    accountId: tenant.accountId
  })
  await server.connect(transport)
  return transport.handleRequest(req)
}

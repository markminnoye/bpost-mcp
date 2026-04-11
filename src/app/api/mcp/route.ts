// src/app/api/mcp/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema, ItemSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials'
import { z } from 'zod'
import { getBatchState, saveBatchState } from '@/lib/kv/client'
import { applyMapping } from '@/lib/batch/apply-mapping'
import { validateMappingTargets } from '@/lib/batch/validate-mapping-targets'
import { requireTenantId } from '@/lib/mcp/require-tenant'
import { env } from '@/lib/config/env'
import { reportIssueToGithub } from '@/lib/github/report-issue'
import { MCP_SERVER_INSTRUCTIONS } from '@/lib/mcp/server-instructions'
import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'
import fs from 'fs/promises'
import path from 'path'
import vm from 'vm'

export const dynamic = 'force-dynamic'

async function resolveCredentials(tenantId: string) {
  const creds = await getCredentialsByTenantId(tenantId)
  if (!creds) {
    throw new Error(`No BPost credentials found for tenant ${tenantId}`)
  }
  return {
    username: creds.bpostUsername,
    password: creds.bpostPassword,
    customerNumber: creds.customerNumber,
    accountId: creds.accountId,
  }
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_service_info',
      {
        description:
          'Returns the BPost MCP service name and semantic version from package.json. ' +
          'Call when the user asks which version or release of the service they are connected to, or for support diagnostics.',
        inputSchema: z.object({}),
      },
      async (_input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError

        const payload = { service: MCP_SERVER_DISPLAY_NAME, version: APP_VERSION }
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
        }
      },
    )

    // ── Self-Learning & Feedback Tools ───────────────────────────────────

    server.registerTool(
      'add_protocol_rule',
      {
        description:
          'Adds a new declarative protocol rule discovered during interaction with BPost. ' +
          'Writes to the shared protocol knowledge base in the submodule.',
        inputSchema: z.object({
          rule: z.string().describe('The rule description, e.g. "MID-4010 means address line too long"'),
          context: z.string().describe('The context or error code this rule relates to'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError

        const rulesPath = path.join(process.cwd(), 'docs/internal/e-masspost/learned_rules.md')
        const timestamp = new Date().toISOString()
        const entry = `\n### [${timestamp}] Context: ${input.context}\n- ${input.rule}\n`

        try {
          await fs.appendFile(rulesPath, entry)
          return { content: [{ type: 'text' as const, text: `Successfully added protocol rule to knowledge base.` }] }
        } catch (err) {
          console.error('[MCP] add_protocol_rule failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to update learned_rules.md' }] }
        }
      },
    )

    server.registerTool(
      'create_fix_script',
      {
        description:
          'Saves a reusable procedural fix script (TypeScript/JavaScript) for automated data cleaning. ' +
          'Scripts can be applied to future batches to prevent recurring errors.',
        inputSchema: z.object({
          name: z
            .string()
            .regex(/^[a-z0-9-]+$/, 'Script name must be lowercase kebab-case (a-z, 0-9, hyphens only)')
            .describe('Unique name for the script, e.g. "clean-street-names"'),
          code: z.string().describe('The executable JS/TS code snippet'),
          description: z.string().describe('Description of what the script fixes'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError

        const scriptsDir = path.join(process.cwd(), 'scripts/auto-fixers')
        const scriptPath = path.join(scriptsDir, `${input.name}.ts`)

        try {
          await fs.mkdir(scriptsDir, { recursive: true })
          const content = `/**\n * ${input.description}\n */\n\n${input.code}\n`
          await fs.writeFile(scriptPath, content)
          return { content: [{ type: 'text' as const, text: `Successfully saved fix script: ${input.name}` }] }
        } catch (err) {
          console.error('[MCP] create_fix_script failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save fix script.' }] }
        }
      },
    )

    server.registerTool(
      'apply_fix_script',
      {
        description:
          'Applies a previously saved fix script to a specific row in an uploaded batch. ' +
          'Automatically re-validates the row after the script execution.',
        inputSchema: z.object({
          batchId: z.string(),
          rowIndex: z.number().int().min(0),
          scriptName: z
            .string()
            .regex(/^[a-z0-9-]+$/, 'Script name must be lowercase kebab-case (a-z, 0-9, hyphens only)')
            .describe('The name of the script to apply (without extension)'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const row = state.rows.find(r => r.index === input.rowIndex)
        if (!row) return { isError: true, content: [{ type: 'text' as const, text: 'Row not found' }] }

        const scriptPath = path.join(process.cwd(), 'scripts/auto-fixers', `${input.scriptName}.ts`)
        let scriptContent: string
        try {
          scriptContent = await fs.readFile(scriptPath, 'utf8')
        } catch {
          return { isError: true, content: [{ type: 'text' as const, text: `Script "${input.scriptName}" not found.` }] }
        }

        const sandbox = { row: { ...row.mapped }, console: { log: () => { } } }
        try {
          // Always wrap in IIFE so scripts can mutate row without needing an explicit return
          const codeToRun = `(function(row){ ${scriptContent}\n return row; })(row)`
          const result = vm.runInNewContext(codeToRun, sandbox, { timeout: 1000 })
          const candidateMapped = typeof result === 'object' ? result : sandbox.row

          const validationResult = ItemSchema.safeParse(candidateMapped)
          if (validationResult.success) {
            row.mapped = validationResult.data
            row.validationErrors = undefined
          } else {
            row.validationErrors = validationResult.error.issues
          }

          await saveBatchState(state)
          if (validationResult.success) {
            return { content: [{ type: 'text' as const, text: `Script applied successfully. Row ${input.rowIndex} is now valid.` }] }
          }
          return { content: [{ type: 'text' as const, text: `Script applied but row ${input.rowIndex} still has validation errors.` }] }
        } catch (err) {
          console.error('[MCP] apply_fix_script failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: `Script execution failed: ${err instanceof Error ? err.message : String(err)}` }] }
        }
      },
    )

    server.registerTool(
      'report_issue',
      {
        description:
          'Reports a technical contradiction, protocol bug, or server failure to the development team via GitHub Issues. ' +
          'When the server has a GitHub token, creates the issue automatically; otherwise returns a prefilled GitHub "new issue" URL for the user to complete in the browser.',
        inputSchema: z.object({
          repo: z.enum(['mcp', 'skills']).describe('Which repository to report to: "mcp" for server bugs, "skills" for protocol/docs issues'),
          title: z.string().describe('Short descriptive title of the issue'),
          body: z.string().describe('Detailed description, including error codes or contradictions found'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError

        return reportIssueToGithub(env.GITHUB_TOKEN, input)
      },
    )

    // ── Batch Pipeline Tools ─────────────────────────────────────────────

    server.registerTool(
      'get_upload_instructions',
      {
        description:
          'Returns a one-line curl command to upload a CSV/Excel file to this service (out-of-band, avoids huge files in chat). ' +
          'Call first when the user has a local file to check; you need the returned batch id for later steps.',
        inputSchema: z.object({}),
      },
      async (_input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const baseUrl = env.NEXT_PUBLIC_BASE_URL
        const uploadUrl = `${baseUrl}/api/batches/upload`
        return {
          content: [{
            type: 'text' as const,
            text: `To securely upload your file, execute the following command in your local terminal exactly as written. Ensure you substitute <YOUR_FILE.csv> and your Bearer token:\n\ncurl -X POST -F "file=@<YOUR_FILE.csv>" ${uploadUrl} -H "Authorization: Bearer <TOKEN>"\n\nAfter a successful upload, you will receive a batchId in the JSON response. Use the "get_raw_headers" tool with that batchId to continue.`,
          }],
        }
      },
    )

    server.registerTool(
      'get_raw_headers',
      {
        description:
          'After upload: returns the spreadsheet column headers for this batch so you can build the column→BPost field map. ' +
          'Call before apply_mapping_rules when headers are unknown.',
        inputSchema: z.object({ batchId: z.string() }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} not found or expired.` }] }
        const errorCount = state.status !== 'UNMAPPED'
          ? state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0).length
          : undefined
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              headers: state.headers,
              status: state.status,
              totalRows: state.rows.length,
              ...(errorCount !== undefined ? { errorCount } : {}),
            }, null, 2),
          }],
        }
      },
    )

    server.registerTool(
      'apply_mapping_rules',
      {
        description:
          'After upload: maps each spreadsheet column header to the correct BPost mailing-row field key (Item schema). ' +
          'Required before row-level checks are meaningful; afterwards each row is validated against bpost field rules.',
        inputSchema: z.object({
          batchId: z.string(),
          mapping: z.record(z.string(), z.string()).describe('Format: { "Client Loc": "postalCode" }'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }
        if (state.status === 'SUBMITTED') {
          return { isError: true, content: [{ type: 'text' as const, text: 'Cannot re-map a submitted batch.' }] }
        }

        const unknownCols = Object.keys(input.mapping).filter(col => !state.headers.includes(col))
        if (unknownCols.length > 0) {
          return { isError: true, content: [{ type: 'text' as const, text: `Mapping references unknown source columns: ${unknownCols.join(', ')}. Available headers: ${state.headers.join(', ')}` }] }
        }

        const targetError = validateMappingTargets(input.mapping)
        if (targetError) {
          return { isError: true, content: [{ type: 'text' as const, text: targetError.hint }] }
        }

        state.rows = state.rows.map(r => {
          const mapped = applyMapping(r.raw, input.mapping, r.index + 1)
          const result = ItemSchema.safeParse(mapped)
          return {
            ...r,
            mapped: result.success ? result.data : mapped,
            validationErrors: result.success ? undefined : result.error.issues,
          }
        })
        state.status = 'MAPPED'
        try {
          await saveBatchState(state)
        } catch (err) {
          console.error('[MCP] saveBatchState failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
        }

        return { content: [{ type: 'text' as const, text: `Successfully mapped ${state.rows.length} rows.` }] }
      },
    )

    server.registerTool(
      'get_batch_errors',
      {
        description:
          'Returns rows that failed field validation after mapping (BPost mailing item rules). Use to fix or explain issues to the user in plain language.',
        inputSchema: z.object({ batchId: z.string(), limit: z.number().int().min(1).default(10) }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const erroredRows = state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0)
        const sliced = erroredRows.slice(0, input.limit)
        return { content: [{ type: 'text' as const, text: JSON.stringify({ totalErrors: erroredRows.length, visible: sliced.length, errors: sliced }, null, 2) }] }
      },
    )

    server.registerTool(
      'apply_row_fix',
      {
        description:
          'Patches one mapped row with corrected field values, re-validates against BPost item rules, and persists the batch state.',
        inputSchema: z.object({
          batchId: z.string(),
          rowIndex: z.number().int().min(0),
          correctedData: z.record(z.string(), z.any()),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const row = state.rows.find(r => r.index === input.rowIndex)
        if (!row) return { isError: true, content: [{ type: 'text' as const, text: 'Row not found' }] }

        const candidateMapped = { ...row.mapped, ...input.correctedData }
        const validationResult = ItemSchema.safeParse(candidateMapped)
        if (validationResult.success) {
          row.mapped = validationResult.data   // only Zod-validated output written to row.mapped
          row.validationErrors = undefined
        } else {
          // On failure: only update validationErrors — row.mapped stays as it was
          row.validationErrors = validationResult.error.issues
        }
        try {
          await saveBatchState(state)
        } catch (err) {
          console.error('[MCP] saveBatchState failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
        }
        if (validationResult.success) {
          return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched and validated successfully.` }] }
        }
        return { content: [{ type: 'text' as const, text: `Row ${input.rowIndex} patched but still has ${validationResult.error.issues.length} validation error(s). Use get_batch_errors to review.` }] }
      },
    )

    server.registerTool(
      'submit_ready_batch',
      {
        description:
          'Submits all validated rows from the current uploaded batch to BPost e-MassPost (XML client). Only rows without validation errors are included.',
        inputSchema: z.object({ batchId: z.string() }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        if (state.status === 'SUBMITTED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} has already been submitted.` }] }
        if (state.status !== 'MAPPED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} is not in MAPPED state. Current status: ${state.status}` }] }

        const readyRows = state.rows.filter(r => !r.validationErrors || r.validationErrors.length === 0)
        if (readyRows.length === 0) return { isError: true, content: [{ type: 'text' as const, text: 'No physically ready rows to submit.' }] }

        state.status = 'SUBMITTED'
        try {
          await saveBatchState(state)
        } catch (err) {
          console.error('[MCP] saveBatchState failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to save batch state. Please retry.' }] }
        }

        return { content: [{ type: 'text' as const, text: `[STUB] ${readyRows.length} rows are ready for submission. BPost XML dispatch is not yet implemented.` }] }
      },
    )

    // ── BPost Core Tools ─────────────────────────────────────────────────

    server.registerTool(
      'bpost_announce_deposit',
      {
        description:
          'Announce a mail deposit to BPost e-MassPost. Accepts a validated DepositRequest payload ' +
          '(Create, Update, Delete, or Validate actions) and returns the BPost response.',
        inputSchema: DepositRequestSchema,
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        const credentials = await resolveCredentials(tenantId)
        const client = createBpostClient(credentials)

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
          },
        }

        const xml = buildXml({ DepositRequest: payload })
        try {
          const result = await client.sendDepositRequest(xml)
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(err.toMcpError(), null, 2) }],
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
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        const credentials = await resolveCredentials(tenantId)
        const client = createBpostClient(credentials)

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
          },
        }

        const xml = buildXml({ MailingRequest: payload })
        try {
          const result = await client.sendMailingRequest(xml)
          return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
        } catch (err) {
          if (err instanceof BpostError) {
            return {
              content: [{ type: 'text' as const, text: JSON.stringify(err.toMcpError(), null, 2) }],
              isError: true,
            }
          }
          throw err
        }
      },
    )
  },
  {
    serverInfo: { name: MCP_SERVER_DISPLAY_NAME, version: APP_VERSION },
    instructions: MCP_SERVER_INSTRUCTIONS,
  },
  { basePath: '/api' },
)

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
  requiredScopes: ['mcp:tools'],
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }

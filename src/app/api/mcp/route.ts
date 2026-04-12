// src/app/api/mcp/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema, ItemSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials'
import { getTenantPreferences } from '@/lib/tenant/get-preferences'
import { generateMidNumber } from '@/lib/batch/generate-barcode'
import { claimBatchSequence } from '@/lib/batch/claim-batch-sequence'
import { z } from 'zod'
import { getBatchState, saveBatchState } from '@/lib/kv/client'
import { applyMapping } from '@/lib/batch/apply-mapping'
import { validateMappingTargets } from '@/lib/batch/validate-mapping-targets'
import { submitBatch } from '@/lib/batch/submit-batch'
import { checkBatch } from '@/lib/batch/check-batch'
import { requireTenantId } from '@/lib/mcp/require-tenant'
import { env } from '@/lib/config/env'
import { reportIssueToGithub } from '@/lib/github/report-issue'
import { MCP_SERVER_INSTRUCTIONS } from '@/lib/mcp/server-instructions'
import { APP_VERSION, MCP_SERVER_DISPLAY_NAME } from '@/lib/app-version'
import fs from 'fs/promises'
import path from 'path'
import vm from 'vm'

export const dynamic = 'force-dynamic'

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

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
    barcodeCustomerId: creds.barcodeCustomerId,
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
          'BATCH PIPELINE step 1/6: Returns a curl command for the user to upload a CSV/Excel file out-of-band. ' +
          'This is the starting point for the batch pipeline. The response includes a batchId needed for all subsequent steps. ' +
          'Next step: get_raw_headers.',
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
          'BATCH PIPELINE step 2/6: Returns the spreadsheet column headers for an uploaded batch so you can build the column→BPost field map. ' +
          'Requires a batchId from a prior upload (get_upload_instructions). ' +
          'Next step: apply_mapping_rules.',
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
          'BATCH PIPELINE step 3/6: Maps each spreadsheet column header to the correct BPost mailing-row field key (Item schema). ' +
          'Requires headers from get_raw_headers. Produces MAPPED status on the batch. ' +
          'Flat fields: lang, priority, psCode, midNum. ' +
          'Address columns: use Comps.<code> dot-notation, e.g. { "Familienaam": "Comps.1", "Voornaam": "Comps.2", "Straatnaam": "Comps.3", "Huisnummer": "Comps.4", "Bus": "Comps.5", "Postcode": "Comps.8", "Gemeente": "Comps.9" }. ' +
          'seq is auto-generated from row index (1-based) unless explicitly mapped. ' +
          'After mapping, each row is validated against BPost field rules. ' +
          'Next step: get_batch_errors to check for validation failures.',
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
          'BATCH PIPELINE step 4/6: Returns rows that failed field validation after mapping (Zod/BPost mailing item rules) AND BPost OptiAddress errors from check_batch. ' +
          'Call after apply_mapping_rules and again after each round of apply_row_fix to check remaining errors. ' +
          'Also call after check_batch to see BPost-level address validation feedback (errors, warnings, suggestions). ' +
          'When totalErrors is 0, the batch is ready for submit_ready_batch. ' +
          'Explain issues to the user in plain language.',
        inputSchema: z.object({ batchId: z.string(), limit: z.number().int().min(1).default(10) }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError
        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }

        const zodErroredRows = state.rows.filter(r => r.validationErrors && r.validationErrors.length > 0)
        const bpostErrorRows = state.rows.filter(r => r.bpostValidation?.status === 'ERROR')
        const bpostWarningRows = state.rows.filter(r => r.bpostValidation?.status === 'WARNING')

        const hasZodErrors = zodErroredRows.length > 0
        const hasBpostErrors = bpostErrorRows.length > 0
        const hasBpostWarnings = bpostWarningRows.length > 0

        if (!hasZodErrors && !hasBpostErrors && !hasBpostWarnings) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ totalErrors: 0, message: 'All rows valid according to Zod AND BPost OptiAddress!' }, null, 2) }] }
        }

        const zodSlice = zodErroredRows.slice(0, input.limit)
        const bpostErrorSlice = bpostErrorRows.slice(0, input.limit)
        const bpostWarningSlice = bpostWarningRows.slice(0, input.limit)

        return { content: [{ type: 'text' as const, text: JSON.stringify({ zodErrors: { total: zodErroredRows.length, visible: zodSlice.length, rows: zodSlice }, bpostErrors: { total: bpostErrorRows.length, visible: bpostErrorSlice.length, rows: bpostErrorSlice }, bpostWarnings: { total: bpostWarningRows.length, visible: bpostWarningSlice.length, rows: bpostWarningSlice } }, null, 2) }] }
      },
    )

    server.registerTool(
      'check_batch',
      {
        description:
          'BATCH PIPELINE step 4b/6: Validates all batch rows against BPost OptiAddress (address validation service) before submission. ' +
          'Call AFTER apply_mapping_rules (step 3) AND BEFORE submit_ready_batch (step 6). ' +
          'MailingCheck is non-destructive — batch stays in MAPPED status and can be called multiple times to re-verify fixes. ' +
          'Use the response to identify rows with BPost-level errors (undeliverable addresses, invalid postal codes, etc.) ' +
          'Use apply_row_fix to correct identified issues, then call check_batch again to re-verify.',
        inputSchema: z.object({
          batchId: z.string(),
          mailingRef: z.string().max(20).optional(),
          mode: z.enum(['P', 'T', 'C']).optional().default('T'),
          customerFileRef: z.string().max(10).optional(),
          copyRequestItem: z.enum(['Y', 'N']).optional().default('N'),
          suggestionsCount: z.number().int().min(0).max(9999).optional().default(5),
          suggestionsMinScore: z.number().int().min(1).max(100).optional().default(60),
          pdpInResponse: z.enum(['Y', 'N']).optional().default('N'),
          allRecordInResponse: z.enum(['Y', 'N']).optional().default('Y'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        const state = await getBatchState(tenantId, input.batchId)
        if (!state) return { isError: true, content: [{ type: 'text' as const, text: 'Batch not found' }] }
        if (state.status !== 'MAPPED') return { isError: true, content: [{ type: 'text' as const, text: `Batch ${input.batchId} is not in MAPPED state. Current status: ${state.status}. Map the batch first using apply_mapping_rules.` }] }

        const credentials = await resolveCredentials(tenantId)

        const now = new Date()
        const mailingRef = input.mailingRef ?? `CHK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
        const customerFileRef = input.customerFileRef ?? input.batchId.slice(0, 10)

        const result = await checkBatch(
          state.rows,
          {
            mailingRef,
            mode: input.mode,
            customerFileRef,
            copyRequestItem: input.copyRequestItem,
            suggestionsCount: input.suggestionsCount,
            suggestionsMinScore: input.suggestionsMinScore,
            pdpInResponse: input.pdpInResponse,
            allRecordInResponse: input.allRecordInResponse,
          },
          credentials,
        )

        if (result.success) {
          // Store per-row validation results back into BatchRow
          const response = result.bpostResponse as Record<string, unknown>
          const mailingCheck = (
            (response.MailingResponse as Record<string, unknown>)?.MailingCheck as Array<Record<string, unknown>>
          )?.[0]
          const replies = mailingCheck?.Replies as Record<string, unknown> | undefined
          const replyArray = (replies?.Reply as Array<Record<string, unknown>>) ?? []

          // Build a map of seq -> validation result
          const validationMap = new Map<number, Record<string, unknown>>()
          for (const reply of replyArray) {
            const seq = reply.seq as number
            validationMap.set(seq, reply)
          }

          // Update bpostValidation on each row
          for (const row of state.rows) {
            const mapped = row.mapped as Record<string, unknown> | undefined
            const seq = mapped?.seq as number | undefined
            if (seq !== undefined && validationMap.has(seq)) {
              const reply = validationMap.get(seq)!
              const statusRec = reply.Status as Record<string, unknown>
              const statusCode = statusRec?.code as string | undefined
              row.bpostValidation = {
                checkedAt: now.toISOString(),
                status: statusCode === 'WARNING' ? 'WARNING' : statusCode === 'ERROR' ? 'ERROR' : 'OK',
                statusCode: statusCode === 'OK' ? undefined : statusCode,
                statusMessage: statusCode !== 'OK' ? (statusRec?.description as string | undefined) : undefined,
              }
            } else {
              row.bpostValidation = {
                checkedAt: now.toISOString(),
                status: 'OK',
              }
            }
          }

          try {
            await saveBatchState(state)
          } catch (err) {
            console.error('[MCP] saveBatchState failed after check_batch:', err)
            return { isError: true, content: [{ type: 'text' as const, text: 'Check completed but state save failed. Please retry.' }] }
          }

          const errorRows = state.rows.filter(r => r.bpostValidation?.status === 'ERROR')
          const warningRows = state.rows.filter(r => r.bpostValidation?.status === 'WARNING')
          const okRows = state.rows.filter(r => r.bpostValidation?.status === 'OK')

          let summary = `Check complete: ${result.checkedCount} rows checked.\nOK: ${okRows.length}`
          if (warningRows.length > 0) summary += ` | Warnings: ${warningRows.length}`
          if (errorRows.length > 0) summary += ` | Errors: ${errorRows.length}`
          summary += '\n\nUse get_batch_errors to see detailed per-row feedback.'

          return { content: [{ type: 'text' as const, text: summary }] }
        }

        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `BPost rejected the check request.\nCode: ${result.error!.code}\nMessage: ${result.error!.message}`,
          }],
        }
      },
    )

    server.registerTool(
      'apply_row_fix',
      {
        description:
          'BATCH PIPELINE step 5/6: Patches one mapped row with corrected field values, re-validates against BPost item rules, and persists the batch state. ' +
          'Use iteratively: fix a row, then call get_batch_errors again to check remaining errors. Repeat until totalErrors is 0.',
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
          'BATCH PIPELINE step 6/6: Submits all validated rows from the current uploaded batch to BPost e-MassPost as a MailingCreate request. ' +
          'Only rows without validation errors are included; skipped rows are reported in the response. ' +
          'IMPORTANT: Before calling, confirm these values with the user: mailingRef, expectedDeliveryDate, format, priority, and mode. ' +
          'The batch must be in MAPPED status with 0 errors (use get_batch_errors to verify). After successful submission, the batch is locked as SUBMITTED. ' +
          'Default mode is T (test). Only use C or P when the user explicitly confirms certification/production readiness.',
        inputSchema: z.object({
          batchId: z.string(),
          expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
          format: z.enum(['Large', 'Small']),
          mailingRef: z.string().max(20).optional(),
          priority: z.enum(['P', 'NP']).optional().default('NP'),
          mode: z.enum(['P', 'T', 'C']).optional().default('T'),
          customerFileRef: z.string().max(10).optional(),
          genMID: z.enum(['N', '7', '9', '11']).optional().default('7'),
          genPSC: z.enum(['Y', 'N']).optional().default('N'),
        }),
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
        if (readyRows.length === 0) return { isError: true, content: [{ type: 'text' as const, text: 'No valid rows to submit. Use get_batch_errors and apply_row_fix first.' }] }

        const credentials = await resolveCredentials(tenantId)

        // ── Barcode strategy resolution ──────────────────────────
        const now = new Date()
        const preferences = await getTenantPreferences(tenantId)
        let resolvedGenMID = input.genMID

        // Only apply strategy defaults when the user did NOT explicitly provide genMID
        const userProvidedGenMID = input.genMID !== '7' // '7' is the schema default
        if (!userProvidedGenMID) {
          switch (preferences.barcodeStrategy) {
            case 'bpost-generates':
              resolvedGenMID = preferences.barcodeLength as 'N' | '7' | '9' | '11'
              break
            case 'customer-provides':
            case 'mcp-generates':
              resolvedGenMID = 'N'
              break
          }
        }

        // Validate strategy-specific requirements
        if (preferences.barcodeStrategy === 'customer-provides') {
          const missingMidNum = readyRows.filter(r => !(r.mapped as Record<string, unknown>)?.midNum)
          if (missingMidNum.length > 0) {
            return { isError: true, content: [{ type: 'text' as const, text: `Strategy is 'customer-provides' but ${missingMidNum.length} rows are missing midNum. Map the midNum column or change barcode strategy in dashboard settings.` }] }
          }
        }

        if (preferences.barcodeStrategy === 'mcp-generates') {
          if (!credentials.barcodeCustomerId) {
            return { isError: true, content: [{ type: 'text' as const, text: `Strategy is 'mcp-generates' but barcodeCustomerId is not configured. Add your 5-digit Barcode-klant-ID in dashboard settings.` }] }
          }
          if (readyRows.length > 999999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch has ${readyRows.length} rows but MCP barcode generation supports max 999,999 per batch.` }] }
          }

          const weekNumber = getISOWeekNumber(now)
          const batchSequence = await claimBatchSequence(tenantId, weekNumber)

          if (batchSequence > 999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch sequence limit reached (1000 batches this week). Try again next week or switch to a different barcode strategy.` }] }
          }

          for (let i = 0; i < readyRows.length; i++) {
            const midNum = generateMidNumber(
              credentials.barcodeCustomerId,
              weekNumber,
              batchSequence,
              i,
            )
            ;(readyRows[i].mapped as Record<string, unknown>).midNum = midNum
          }
        }

        const mailingRef = input.mailingRef ?? `B-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
        const customerFileRef = input.customerFileRef ?? input.batchId.slice(0, 10)

        const result = await submitBatch(
          readyRows,
          {
            mailingRef,
            expectedDeliveryDate: input.expectedDeliveryDate,
            format: input.format,
            priority: input.priority,
            mode: input.mode,
            customerFileRef,
            genMID: resolvedGenMID,
            genPSC: input.genPSC,
          },
          credentials,
        )

        const skippedCount = state.rows.length - readyRows.length
        const authInfo = extra.authInfo
        const userId = (authInfo?.extra as Record<string, unknown> | undefined)?.userId as string | undefined
        const clientId = authInfo?.clientId ?? 'unknown'

        if (result.success) {
          state.status = 'SUBMITTED'
          state.submission = {
            mailingRef,
            expectedDeliveryDate: input.expectedDeliveryDate,
            format: input.format,
            priority: input.priority,
            mode: input.mode,
            customerFileRef,
            genMID: resolvedGenMID,
            genPSC: input.genPSC,
            submittedAt: now.toISOString(),
            submittedRowCount: readyRows.length,
            skippedRowCount: skippedCount,
            userId,
            clientId,
            bpostStatus: 'OK',
          }
          try {
            await saveBatchState(state)
          } catch (err) {
            console.error('[MCP] saveBatchState failed after BPost success:', err)
            return { isError: true, content: [{ type: 'text' as const, text: `BPost accepted the mailing but state save failed. mailingRef: ${mailingRef}. Please contact support.` }] }
          }

          return {
            content: [{
              type: 'text' as const,
              text: `Mailing submitted: ${readyRows.length} rows sent, ${skippedCount} skipped (validation errors).\nmailingRef: ${mailingRef}\nBPost status: OK`,
            }],
          }
        }

        // BPost error — batch stays MAPPED
        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `BPost rejected the mailing.\nCode: ${result.error!.code}\nMessage: ${result.error!.message}\nBatch stays in MAPPED status — fix errors and retry.`,
          }],
        }
      },
    )

    // ── BPost Core Tools ─────────────────────────────────────────────────

    server.registerTool(
      'bpost_announce_deposit',
      {
        description:
          'DIRECT TOOL (not part of the batch pipeline): Announce a mail deposit to BPost e-MassPost. ' +
          'Accepts a pre-built DepositRequest payload (Create, Update, Delete, or Validate actions). ' +
          'Use only when the user already has a structured deposit payload. ' +
          'Deposits must be linked to mailings via master/slave: if deposit is master, set depositRef and leave mailingRef empty; ' +
          'if mailing is master, reference the existing mailingRef. See server instructions for linking rules.',
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
          'DIRECT TOOL (not part of the batch pipeline): Announce a mailing to BPost e-MassPost. ' +
          'Accepts a pre-built MailingRequest payload and returns the BPost response or a structured error with the MPW/MID code. ' +
          'Use only when the user already has a structured mailing payload. ' +
          'For CSV/XLSX files from users, use the batch pipeline instead (starting with get_upload_instructions). ' +
          'If linking to a deposit: set mailingRef; if this mailing is the slave, also set depositRef to the master deposit.',
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

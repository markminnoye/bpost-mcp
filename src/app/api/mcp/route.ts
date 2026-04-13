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
import { ingestCsv } from '@/lib/batch/ingest-csv'
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

/**
 * Friendly English alias → internal bpost field mapping.
 * The LLM uses these aliases; this layer translates them before processing.
 * Unknown values (e.g. "Comps.70") are passed through untouched (hybrid fallback).
 */
/** Same keys as internal names are listed for documentation parity with the tool description. */
const BPOST_ALIASES: Record<string, string> = {
  lastName:      'Comps.1',
  firstName:     'Comps.2',
  street:        'Comps.3',
  houseNumber:   'Comps.4',
  box:           'Comps.5',
  postalCode:    'Comps.8',
  municipality:  'Comps.9',
  language:      'lang',
  priority:      'priority',
  mailIdBarcode: 'midNum',
  presortCode:   'psCode',
}

function resolveMappingTarget(target: string): string {
  if (Object.prototype.hasOwnProperty.call(BPOST_ALIASES, target)) {
    return BPOST_ALIASES[target]
  }
  return target
}

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
          'Reports a technical contradiction, protocol bug, or server failure to the development team via GitHub Issues in markminnoye/bpost-mcp (protocol/docs findings belong here too). ' +
          'When the server has a GitHub token, creates the issue automatically; otherwise returns a prefilled GitHub "new issue" URL for the user to complete in the browser.',
        inputSchema: z.object({
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
      'upload_batch_file',
      {
        description:
          'BATCH PIPELINE step 1/6 (preferred): Upload a CSV file directly through the MCP protocol. ' +
          'Pass the file content as a base64-encoded string — the server decodes it, authenticates using your session token, ' +
          'parses the CSV, and stores the batch securely under your tenant. ' +
          'Returns a batchId needed for all subsequent pipeline steps. ' +
          'Use this tool instead of get_upload_instructions whenever possible — it avoids the need for out-of-band curl commands. ' +
          'Next step: get_raw_headers.',
        inputSchema: z.object({
          fileName: z.string().describe('Original file name, must end with .csv'),
          fileContentBase64: z.string().describe('Full content of the CSV file encoded as base64'),
        }),
      },
      async (input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const tenantId = tenantOrError

        let csvText: string
        try {
          csvText = Buffer.from(input.fileContentBase64, 'base64').toString('utf-8')
        } catch {
          return { isError: true, content: [{ type: 'text' as const, text: 'Invalid base64 encoding. Ensure fileContentBase64 is a valid base64 string.' }] }
        }

        if (csvText.trim().length === 0) {
          return { isError: true, content: [{ type: 'text' as const, text: 'File content is empty after decoding.' }] }
        }

        const result = ingestCsv(csvText, input.fileName, tenantId)

        if (!result.ok) {
          return { isError: true, content: [{ type: 'text' as const, text: result.error.message }] }
        }

        try {
          await saveBatchState(result.state)
        } catch (err) {
          console.error('[MCP] upload_batch_file saveBatchState failed:', err)
          return { isError: true, content: [{ type: 'text' as const, text: 'Failed to store batch. Please retry.' }] }
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              batchId: result.state.batchId,
              status: result.state.status,
              totalRows: result.state.rows.length,
              nextStep: 'Call get_raw_headers with this batchId to inspect column headers.',
            }, null, 2),
          }],
        }
      },
    )

    server.registerTool(
      'get_upload_instructions',
      {
        description:
          'BATCH PIPELINE step 1/6 (manual fallback): Returns upload request details (endpoint, method, headers, multipart field) plus an example curl command ' +
          'for environments where upload_batch_file cannot be used. ' +
          'Prefer upload_batch_file for agent-native uploads that avoid manual curl steps. ' +
          'Next step: get_raw_headers.',
        inputSchema: z.object({}),
      },
      async (_input, extra) => {
        const tenantOrError = requireTenantId(extra)
        if (typeof tenantOrError !== 'string') return tenantOrError
        const baseUrl = env.NEXT_PUBLIC_BASE_URL
        const uploadUrl = `${baseUrl}/api/batches/upload`
        const payload = {
          upload: {
            method: 'POST',
            url: uploadUrl,
            authHeader: 'Authorization: Bearer <TOKEN>',
            multipartField: 'file',
            acceptedFormats: ['csv'],
          },
          exampleCurl: `curl -X POST -F "file=@<YOUR_FILE.csv>" ${uploadUrl} -H "Authorization: Bearer <TOKEN>"`,
          responseShape: {
            batchId: '<batch-id>',
          },
          nextStep: 'Call get_raw_headers with the batchId from the upload response.',
          note: 'For agent-native upload without curl, use the upload_batch_file tool instead.',
        }
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(payload, null, 2),
          }],
        }
      },
    )

    server.registerTool(
      'get_raw_headers',
      {
        description:
          'BATCH PIPELINE step 2/6: Returns the spreadsheet column headers for an uploaded batch so you can build the column→BPost field map. ' +
          'Requires a batchId from a prior upload (upload_batch_file, or get_upload_instructions as manual fallback). ' +
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
          'BATCH PIPELINE step 3/6: Maps each spreadsheet column header to the correct BPost mailing-row field. ' +
          'Requires headers from get_raw_headers. Produces MAPPED status on the batch. ' +
          'Use these friendly field names as mapping targets: ' +
          '"lastName" (recipient last name), "firstName" (first name), "street" (street name), ' +
          '"houseNumber" (house number), "box" (box/bus number), "postalCode" (postal code), ' +
          '"municipality" (city/town), "language" (lang: nl/fr/de), "priority" (P or NP), ' +
          '"mailIdBarcode" (customer-provided Mail ID barcode, 14–18 digits), ' +
          '"presortCode" (pre-sort code). ' +
          'Advanced: you may also use Comps.<code> dot-notation directly (e.g. "Comps.70") for fields without an alias. ' +
          'seq is auto-generated from row index (1-based) unless explicitly mapped. ' +
          'After mapping, each row is validated against BPost field rules. ' +
          'Next step: get_batch_errors to check for validation failures.',
        inputSchema: z.object({
          batchId: z.string(),
          mapping: z.record(z.string(), z.string()).describe(
            'Map each CSV column header to a field name. ' +
            'Example: { "Familienaam": "lastName", "Straat": "street", "Postcode": "postalCode" }'
          ),
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

        // Translate friendly aliases to internal bpost field names before validation
        const resolvedMapping: Record<string, string> = {}
        for (const [col, target] of Object.entries(input.mapping)) {
          resolvedMapping[col] = resolveMappingTarget(target)
        }

        const unknownCols = Object.keys(resolvedMapping).filter(col => !state.headers.includes(col))
        if (unknownCols.length > 0) {
          return { isError: true, content: [{ type: 'text' as const, text: `Mapping references unknown source columns: ${unknownCols.join(', ')}. Available headers: ${state.headers.join(', ')}` }] }
        }

        const targetError = validateMappingTargets(resolvedMapping)
        if (targetError) {
          return { isError: true, content: [{ type: 'text' as const, text: targetError.hint }] }
        }

        state.rows = state.rows.map(r => {
          const mapped = applyMapping(r.raw, resolvedMapping, r.index + 1)
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
          'Default mode is T (test). Only use C or P when the user explicitly confirms certification/production readiness. ' +
          'barcodeStrategy controls Mail ID barcode generation: ' +
          '"bpost-generates" = bpost generates barcodes automatically (use barcodeLength to select 7, 9, or 11 digits; defaults to 7); ' +
          '"customer-provides" = each row must already have a mailIdBarcode value mapped; ' +
          '"mcp-generates" = the MCP server generates unique barcodes using the configured barcode customer ID. ' +
          'If omitted, the user\'s dashboard default barcode strategy is used. ' +
          'barcodeLength is only valid together with barcodeStrategy "bpost-generates".',
        inputSchema: z.object({
          batchId: z.string(),
          expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
          format: z.enum(['Large', 'Small']),
          mailingRef: z.string().max(20).optional(),
          priority: z.enum(['P', 'NP']).optional().default('NP'),
          mode: z.enum(['P', 'T', 'C']).optional().default('T'),
          customerFileRef: z.string().max(10).optional(),
          barcodeStrategy: z.enum(['bpost-generates', 'customer-provides', 'mcp-generates']).optional()
            .describe('Barcode generation strategy. If omitted, uses the user\'s dashboard default.'),
          barcodeLength: z.enum(['7', '9', '11']).optional()
            .describe('Number of digits for bpost-generated barcodes. Only used when barcodeStrategy is "bpost-generates". Defaults to 7.'),
          genPSC: z.enum(['Y', 'N']).optional().default('N'),
        }).refine(
          (data) => data.barcodeLength === undefined || data.barcodeStrategy === 'bpost-generates',
          {
            message: 'barcodeLength is only allowed when barcodeStrategy is "bpost-generates". Either set barcodeStrategy to "bpost-generates" or omit barcodeLength.',
            path: ['barcodeLength'],
          },
        ),
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

        // Determine effective strategy: caller's explicit input overrides dashboard setting
        const effectiveStrategy = input.barcodeStrategy ?? preferences.barcodeStrategy

        let resolvedGenMID: 'N' | '7' | '9' | '11'
        if (input.barcodeStrategy !== undefined) {
          // Caller explicitly provided a strategy — use it, ignore dashboard setting
          switch (input.barcodeStrategy) {
            case 'bpost-generates':
              resolvedGenMID = (input.barcodeLength ?? '7') as '7' | '9' | '11'
              break
            case 'customer-provides':
            case 'mcp-generates':
              resolvedGenMID = 'N'
              break
          }
        } else {
          // Fall back to dashboard strategy
          switch (preferences.barcodeStrategy) {
            case 'bpost-generates':
              resolvedGenMID = (preferences.barcodeLength ?? '7') as 'N' | '7' | '9' | '11'
              break
            case 'customer-provides':
            case 'mcp-generates':
              resolvedGenMID = 'N'
              break
            default:
              resolvedGenMID = '7'
          }
        }

        // Validate strategy-specific requirements
        if (effectiveStrategy === 'customer-provides') {
          const MID_PATTERN = /^[0-9]{14,18}$/
          const invalidRows = readyRows.filter(r => {
            const midNum = (r.mapped as Record<string, unknown>)?.midNum
            return !midNum || !MID_PATTERN.test(String(midNum))
          })
          if (invalidRows.length > 0) {
            const hint = input.barcodeStrategy === 'customer-provides'
              ? `Strategy is 'customer-provides' (from this tool call) but ${invalidRows.length} rows have missing or invalid midNum (must be 14–18 digits). Map a column to mailIdBarcode / midNum, or call again with barcodeStrategy "bpost-generates" or "mcp-generates".`
              : `Strategy is 'customer-provides' (from dashboard settings) but ${invalidRows.length} rows have missing or invalid midNum (must be 14–18 digits). Map a column to mailIdBarcode / midNum, override with barcodeStrategy in this tool, or change the strategy in dashboard settings.`
            return { isError: true, content: [{ type: 'text' as const, text: hint }] }
          }
        }

        if (effectiveStrategy === 'mcp-generates') {
          if (!credentials.barcodeCustomerId) {
            const hint = input.barcodeStrategy === 'mcp-generates'
              ? `Strategy is 'mcp-generates' (from this tool call) but barcodeCustomerId is not configured. Add your 5-digit Barcode-klant-ID in dashboard settings, or call again with a different barcodeStrategy.`
              : `Strategy is 'mcp-generates' (from dashboard settings) but barcodeCustomerId is not configured. Add your 5-digit Barcode-klant-ID in dashboard settings, or override barcodeStrategy in this tool.`
            return { isError: true, content: [{ type: 'text' as const, text: hint }] }
          }
          if (readyRows.length > 999999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch has ${readyRows.length} rows but MCP barcode generation supports max 999,999 per batch.` }] }
          }

          const weekNumber = getISOWeekNumber(now)
          let batchSequence: number
          try {
            batchSequence = await claimBatchSequence(tenantId, weekNumber)
          } catch {
            return { isError: true, content: [{ type: 'text' as const, text: 'Internal error while reserving barcode range. Please try again.' }] }
          }

          if (batchSequence > 999) {
            return { isError: true, content: [{ type: 'text' as const, text: `Batch sequence limit reached for ISO week ${weekNumber} (max 1000 batches per week in mcp-generates mode). No further batches can use mcp-generates this week. Try again next ISO week or switch to bpost-generates or customer-provides strategy.` }] }
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
          'For CSV files from users, use the batch pipeline instead (starting with upload_batch_file). ' +
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

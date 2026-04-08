// src/app/api/mcp/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { verifyToken } from '@/lib/oauth/verify-token'
import { getCredentialsByTenantId } from '@/lib/tenant/get-credentials'

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
      'bpost_announce_deposit',
      {
        description:
          'Announce a mail deposit to BPost e-MassPost. Accepts a validated DepositRequest payload ' +
          '(Create, Update, Delete, or Validate actions) and returns the BPost response.',
        inputSchema: DepositRequestSchema,
      },
      async (input, extra) => {
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }

        const credentials = await resolveCredentials(tenantId)
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
        const tenantId = extra.authInfo?.extra?.tenantId as string | undefined
        if (!tenantId) {
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Unauthorized: no tenant context' }) }],
            isError: true,
          }
        }

        const credentials = await resolveCredentials(tenantId)
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
  { serverInfo: { name: 'bpost-emasspost', version: '1.0.0' } },
  { basePath: '/api' },
)

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
})

export { authHandler as GET, authHandler as POST, authHandler as DELETE }

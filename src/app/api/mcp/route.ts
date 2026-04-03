// src/app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { MailingRequestSchema } from '@/schemas/mailing-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'
import { resolveTenant } from '@/lib/tenant/resolve'

interface BpostCredentials {
  username: string
  password: string
}

function createServer(credentials: BpostCredentials): McpServer {
  const server = new McpServer({
    name: 'bpost-emasspost',
    version: '1.0.0',
  })

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
      const xml = buildXml({ DepositRequest: input })
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
      const xml = buildXml({ MailingRequest: input })
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
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
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
  const server = createServer({ username: tenant.bpostUsername, password: tenant.bpostPassword })
  await server.connect(transport)
  return transport.handleRequest(req)
}

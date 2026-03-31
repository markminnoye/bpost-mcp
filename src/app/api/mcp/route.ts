// src/app/api/mcp/route.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'
import { DepositRequestSchema } from '@/schemas/deposit-request'
import { buildXml } from '@/lib/xml'
import { createBpostClient } from '@/client/bpost'
import { BpostError } from '@/client/errors'

function createServer(): McpServer {
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
      const client = createBpostClient()
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
      inputSchema: z.object({}).passthrough(), // replace with MailingRequestSchema in Task 9
    },
    async (_input) => {
      return {
        content: [{ type: 'text', text: 'MailingRequest not yet implemented — see Task 9' }],
        isError: true,
      }
    },
  )

  return server
}

export async function POST(req: Request): Promise<Response> {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  const server = createServer()
  await server.connect(transport)
  return transport.handleRequest(req)
}

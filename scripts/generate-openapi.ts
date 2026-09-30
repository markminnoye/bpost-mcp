/**
 * OpenAPI 3.1 from Zod schemas that route handlers already parse.
 *
 * When a route gains a Zod contract, import that schema and add one
 * `registry.registerPath` call. Handlers without a Zod schema are omitted.
 * Do not describe a body here that the handler does not validate.
 *
 * Run: npm run docs:api
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { stringify } from 'yaml'
import { RegisterRequestSchema } from '../src/app/oauth/register/schema'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { version: string }

const registry = new OpenAPIRegistry()

registry.registerPath({
  method: 'post',
  path: '/oauth/register',
  summary: 'Register an OAuth client',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Client registered. The response body is not described by a Zod schema.',
    },
    400: {
      description: 'Body failed RegisterRequestSchema (invalid_client_metadata).',
    },
    500: {
      description: 'Registration failed (server_error).',
    },
  },
})

const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'HTTP API',
    version: pkg.version,
    description:
      'Generated from Zod schemas used by non-MCP route handlers. Handlers without a Zod schema are omitted.',
  },
})

const outDir = path.join(root, 'docs/api-reference')
mkdirSync(outDir, { recursive: true })
const yaml = stringify(document, { lineWidth: 0 })
writeFileSync(path.join(outDir, 'openapi.yaml'), yaml.endsWith('\n') ? yaml : `${yaml}\n`)

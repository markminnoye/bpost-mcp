/**
 * OpenAPI 3.1 for the HTTP service (not MCP).
 *
 * Import the Zod schema the route uses, or a schema that only describes
 * request/response when wiring it into the handler would change behavior.
 * Output: docs/ontwikkelaars/api/openapi.yaml
 *
 * Run: npm run docs:api
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { stringify } from 'yaml'
import { z, type ZodType } from 'zod'
import { UploadBatchCreatedSchema, UploadBatchErrorSchema, UploadBatchRequestSchema } from '../src/app/api/batches/upload/schema'
import { InstallPromptBodySchema, InstallPromptMissingSchema } from '../src/app/api/install/prompt/schema'
import { SuggestMappingErrorSchema, SuggestMappingRequestSchema, SuggestMappingResponseSchema } from '../src/app/api/masspost/suggest-mapping/schema'
import { HealthResponseSchema } from '../src/app/health/schema'
import { ReadyResponseSchema } from '../src/app/ready/schema'
import { VersionResponseSchema } from '../src/app/version/schema'
import { AuthorizationServerMetadataSchema } from '../src/app/.well-known/oauth-authorization-server/schema'
import { ProtectedResourceMetadataSchema } from '../src/app/.well-known/oauth-protected-resource/schema'
import { AuthorizeQuerySchema } from '../src/app/oauth/authorize/schema'
import { OAuthErrorSchema } from '../src/app/oauth/error-schema'
import { RegisterRequestSchema, RegisterResponseSchema } from '../src/app/oauth/register/schema'
import { TokenRequestSchema, TokenResponseSchema } from '../src/app/oauth/token/schema'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { version: string }

function json(schema: ZodType, description: string) {
  return {
    description,
    content: { 'application/json': { schema } },
  }
}

const registry = new OpenAPIRegistry()

registry.registerPath({
  method: 'get',
  path: '/health',
  summary: 'Liveness',
  responses: { 200: json(HealthResponseSchema, 'Process is up.') },
})

registry.registerPath({
  method: 'get',
  path: '/version',
  summary: 'Build version',
  responses: { 200: json(VersionResponseSchema, 'Service name and version.') },
})

registry.registerPath({
  method: 'get',
  path: '/ready',
  summary: 'Readiness',
  responses: {
    200: json(ReadyResponseSchema, 'Dependencies are ready. `failures` is omitted.'),
    503: json(ReadyResponseSchema, 'A dependency failed. `failures` lists the names.'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/install/prompt',
  summary: 'Install assistant prompt',
  responses: {
    200: {
      description: 'Markdown prompt.',
      content: { 'text/markdown': { schema: InstallPromptBodySchema } },
    },
    404: {
      description: 'Prompt file could not be read.',
      content: { 'text/plain': { schema: InstallPromptMissingSchema } },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/batches/upload',
  summary: 'Upload a CSV batch',
  description:
    'Requires a bearer token or a signed-in session. The handler reads multipart form data itself; these schemas describe that contract.',
  request: {
    body: {
      required: true,
      content: { 'multipart/form-data': { schema: UploadBatchRequestSchema } },
    },
  },
  responses: {
    201: json(UploadBatchCreatedSchema, 'CSV stored.'),
    400: json(UploadBatchErrorSchema, 'Missing file, unsupported format, parse error, or empty file.'),
    401: json(UploadBatchErrorSchema, 'Missing or invalid authentication.'),
    403: json(UploadBatchErrorSchema, 'Account has no tenant.'),
    413: json(UploadBatchErrorSchema, 'Too many rows.'),
    500: json(UploadBatchErrorSchema, 'Unexpected failure. `details` may be set.'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/masspost/suggest-mapping',
  summary: 'Ask an AI model for a column mapping',
  description:
    'Requires a bearer token or a signed-in session. Sends column titles, fill counts and masked sample values (`maskValue` in `src/core/masspost/mask.ts`) to the configured model; the server masks the examples again. Returns every column exactly once: in an address block (list order is envelope order), under `context` or under `ignore`. The rule-based suggestion (`suggestColumnMapping`) is a library function and runs in the client. See ADR 0006.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: SuggestMappingRequestSchema } },
    },
  },
  responses: {
    200: json(SuggestMappingResponseSchema, 'Proposed mapping.'),
    400: json(SuggestMappingErrorSchema, 'Invalid JSON or invalid body (e.g. duplicate column titles, more than 5 examples).'),
    401: json(SuggestMappingErrorSchema, 'Missing or invalid authentication.'),
    403: json(SuggestMappingErrorSchema, 'Account has no tenant.'),
    422: json(SuggestMappingErrorSchema, 'The model gave no valid proposal (`ai_invalid_output`).'),
    502: json(SuggestMappingErrorSchema, 'The model call failed or timed out (`ai_failed`).'),
    503: json(SuggestMappingErrorSchema, 'No model configured (`ai_not_configured`).'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/.well-known/oauth-authorization-server',
  summary: 'OAuth authorization server metadata',
  responses: {
    200: json(AuthorizationServerMetadataSchema, 'Metadata. URLs use the request host.'),
  },
})

registry.registerPath({
  method: 'options',
  path: '/.well-known/oauth-authorization-server',
  summary: 'CORS preflight for authorization server metadata',
  responses: { 204: { description: 'No body. CORS headers only.' } },
})

registry.registerPath({
  method: 'get',
  path: '/.well-known/oauth-protected-resource',
  summary: 'OAuth protected resource metadata',
  description: 'Body is produced by mcp-handler. The schema describes that JSON; the handler is unchanged.',
  responses: {
    200: json(ProtectedResourceMetadataSchema, 'OAuth protected-resource metadata (`resource` and `authorization_servers`).'),
  },
})

registry.registerPath({
  method: 'options',
  path: '/.well-known/oauth-protected-resource',
  summary: 'CORS preflight for protected resource metadata',
  responses: { 200: { description: 'No body. CORS headers only.' } },
})

registry.registerPath({
  method: 'post',
  path: '/oauth/register',
  summary: 'Register an OAuth client',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: RegisterRequestSchema } },
    },
  },
  responses: {
    201: json(RegisterResponseSchema, 'Client registered. `client_secret` is returned only in this response.'),
    400: json(OAuthErrorSchema, 'Body failed RegisterRequestSchema (`invalid_client_metadata`).'),
    500: json(OAuthErrorSchema, 'Registration failed (`server_error`).'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/oauth/authorize',
  summary: 'Start the authorization code flow',
  description:
    'Query is described by AuthorizeQuerySchema. The handler still validates by hand, then redirects (302) or returns an OAuth error JSON (400).',
  request: { query: AuthorizeQuerySchema },
  responses: {
    302: { description: 'Redirect to the client, to sign-in, or to the dashboard.' },
    400: json(OAuthErrorSchema, 'Invalid or missing authorization request.'),
  },
})

registry.registerPath({
  method: 'post',
  path: '/oauth/token',
  summary: 'Exchange a code or refresh token',
  description:
    'Body must be `application/x-www-form-urlencoded`. The handler still reads URLSearchParams itself.',
  request: {
    body: {
      required: true,
      content: { 'application/x-www-form-urlencoded': { schema: TokenRequestSchema } },
    },
  },
  responses: {
    200: json(TokenResponseSchema, 'Access token and rotated refresh token.'),
    400: json(OAuthErrorSchema, 'Bad content type, missing fields, or unsupported grant.'),
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/auth/{path}',
  summary: 'Auth.js (external)',
  description:
    'Implemented by Auth.js (NextAuth) at `/api/auth/[...nextauth]`. Request and response are not a Zod contract of this service, so they are not described here.',
  request: {
    params: authPathParams(),
  },
  responses: {
    200: { description: 'Auth.js response (HTML, redirect, or JSON). Not described here.' },
    302: { description: 'Auth.js redirect.' },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/auth/{path}',
  summary: 'Auth.js (external)',
  description:
    'Implemented by Auth.js (NextAuth). Excluded from our schemas because the catch-all is owned by that library.',
  request: {
    params: authPathParams(),
  },
  responses: {
    200: { description: 'Auth.js response. Not described here.' },
    302: { description: 'Auth.js redirect.' },
  },
})

function authPathParams() {
  return z.object({
    path: z.string().meta({ description: 'Auth.js catch-all, for example `signin` or `callback/google`.' }),
  })
}

const document = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'HTTP service',
    version: pkg.version,
    description:
      'HTTP routes of this service. The MCP endpoint is not part of this document; see docs/documentatie/mcp/README.md.',
  },
})

const outDir = path.join(root, 'docs/ontwikkelaars/api')
mkdirSync(outDir, { recursive: true })
const yaml = stringify(document, { lineWidth: 0 })
writeFileSync(path.join(outDir, 'openapi.yaml'), yaml.endsWith('\n') ? yaml : `${yaml}\n`)

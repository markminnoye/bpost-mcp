import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const bpostCredentials = pgTable('bpost_credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  username: text('username').notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  passwordIv: text('password_iv').notNull(),
  customerNumber: text('customer_number').notNull(),
  accountId: text('account_id').notNull(),
  prsNumber: text('prs_number'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const apiTokens = pgTable('api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  tokenHash: text('token_hash').notNull().unique(),
  label: text('label').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
})

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  tool: text('tool').notNull(),
  action: text('action').notNull(),
  status: text('status').notNull(),
  errorCode: text('error_code'),
  durationMs: integer('duration_ms').notNull(),
  calledAt: timestamp('called_at').notNull().defaultNow(),
})

export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  tenantId: uuid('tenant_id').references(() => tenants.id),
})

export const accounts = pgTable('account', {
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
})

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
})

export const oauthClients = pgTable('oauth_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: text('client_id').notNull().unique(),
  clientSecret: text('client_secret'), // SHA-256 hashed, null for public clients
  clientName: text('client_name'),
  redirectUris: text('redirect_uris').array().notNull(),
  grantTypes: text('grant_types').array().notNull().default(sql`ARRAY['authorization_code','refresh_token']`),
  responseTypes: text('response_types').array().notNull().default(sql`ARRAY['code']`),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const oauthAuthorizationCodes = pgTable('oauth_authorization_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(), // SHA-256 hashed
  clientId: text('client_id').notNull(), // DCR client or URL-format, no FK
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  redirectUri: text('redirect_uri').notNull(),
  scope: text('scope'),
  codeChallenge: text('code_challenge').notNull(),
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),
  resource: text('resource'), // RFC 8707
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
})

export const oauthRefreshTokens = pgTable('oauth_refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  clientId: text('client_id').notNull(), // DCR client or URL-format, no FK
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  scope: text('scope'),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// src/core/masspost/credentials.ts
import { env } from '@/lib/config/env'
import { normalizeBpostCustomerFileRef } from '@/core/masspost/file-naming'

/**
 * Single-tenant bpost credentials (Contrapunt). Unlike the multi-tenant MCP service
 * (src/lib/tenant/get-credentials.ts, Vault-backed), this library has no tenant concept —
 * credentials are read once from env and passed as plain parameters into transport functions.
 */

/** Mail ID file version written in the XML context and the filename. */
export type MidProtocolVersion = '0100' | '0102' | '0200'

/** HTTP Basic Auth credentials plus the ids a MailingRequest must repeat. */
export interface HttpCredentials {
  username: string
  password: string
  /** PRS id — Context/@sender and Header/@customerId (same value). */
  customerId: string
  /** PBC account id — Header/@accountId. */
  accountId: string
  /** Mail ID barcode program id (5 digits), optional until you generate MID numbers. */
  barcodeCustomerId?: string
  /** MID file version in Context and filename. Contrapunt: locked to 0200 (v2.00). */
  midVersion: MidProtocolVersion
  /** RequestProps customerFileRef and filename NNNNNNNNNN token (exactly 10 chars after normalize). */
  customerFileRef: string
}

/** FTP(S) login for the file drop. */
export interface FtpCredentials {
  host: string
  username: string
  password: string
  secure: boolean
}

/** Thrown when a credential read is missing required environment variables. The message lists them. */
export class MissingCredentialsError extends Error {
  constructor(missing: string[]) {
    super(
      `Bpost-credentials ontbreken: ${missing.join(', ')}. Zet ze in .env.local (zie src/lib/config/env.ts).`,
    )
    this.name = 'MissingCredentialsError'
  }
}

function resolveCustomerId(): string | undefined {
  return env.BPOST_TEST_CUSTOMER_ID ?? env.BPOST_TEST_CUSTOMER_NUMBER
}

/** Resolves HTTP (Basic Auth) credentials. Fails fast, but only when actually called.
 *
 * @returns Credentials from the `BPOST_TEST_*` environment variables.
 * @throws {MissingCredentialsError} When username, password, customer id, or account id is missing.
 */
export function getHttpCredentials(): HttpCredentials {
  const customerId = resolveCustomerId()
  const missing: string[] = []
  if (!env.BPOST_TEST_USERNAME) missing.push('BPOST_TEST_USERNAME')
  if (!env.BPOST_TEST_PASSWORD) missing.push('BPOST_TEST_PASSWORD')
  if (!customerId) missing.push('BPOST_TEST_CUSTOMER_ID (of legacy BPOST_TEST_CUSTOMER_NUMBER)')
  if (!env.BPOST_TEST_ACCOUNT_ID) missing.push('BPOST_TEST_ACCOUNT_ID')
  if (missing.length > 0) throw new MissingCredentialsError(missing)

  return {
    username: env.BPOST_TEST_USERNAME as string,
    password: env.BPOST_TEST_PASSWORD as string,
    customerId: customerId as string,
    accountId: env.BPOST_TEST_ACCOUNT_ID as string,
    barcodeCustomerId: env.BPOST_TEST_BARCODE_CUSTOMER_ID,
    midVersion: env.BPOST_TEST_MID_VERSION,
    customerFileRef: normalizeBpostCustomerFileRef(env.BPOST_TEST_CUSTOMER_FILE_REF),
  }
}

/** Resolves FTP(S) credentials. Falls back to the HTTP login when no FTP-specific login is set.
 *
 * @returns Host, user, password, and whether to use TLS.
 * @throws {MissingCredentialsError} When no username or password is available.
 */
export function getFtpCredentials(): FtpCredentials {
  const username = env.BPOST_FTP_USERNAME ?? env.BPOST_TEST_USERNAME
  const password = env.BPOST_FTP_PASSWORD ?? env.BPOST_TEST_PASSWORD

  const missing: string[] = []
  if (!username) missing.push('BPOST_FTP_USERNAME (of BPOST_TEST_USERNAME)')
  if (!password) missing.push('BPOST_FTP_PASSWORD (of BPOST_TEST_PASSWORD)')
  if (missing.length > 0) throw new MissingCredentialsError(missing)

  return {
    host: env.BPOST_FTP_HOST,
    username: username as string,
    password: password as string,
    secure: env.BPOST_FTP_SECURE,
  }
}

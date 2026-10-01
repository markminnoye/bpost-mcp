// src/core/masspost/transport/ftp.ts
import { Client } from 'basic-ftp'
import { Readable } from 'node:stream'
import type { FtpCredentials } from '../credentials'
import { bpostFtpTlsOptions } from './bpost-ca'

/** Remote name and size after a successful FTP upload. */
export interface FtpUploadResult {
  remoteFileName: string
  bytesSent: number
}

/** Optional tracing for Connection & Security Test diagnostics with bpost. */
export interface FtpUploadOptions {
  /**
   * When true, mirror the full FTP control-channel transcript (AUTH TLS, USER, PASV, …)
   * via {@link FtpUploadOptions.log} or `console.log`.
   */
  debug?: boolean
  /** Sink for protocol lines and step markers. Defaults to `console.log` when `debug` is set. */
  log?: (line: string) => void
}

/** Thrown when the file name is rejected or the FTP session fails. */
export class FtpTransportError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'FtpTransportError'
  }
}

/**
 * Uploads a MailingRequest XML to bpost's FTP(S) `\requests` folder, following bpost's
 * documented .TMP-then-rename procedure so partial uploads are never picked up mid-transfer.
 * See docs/internal/e-masspost/docs/transport/ftp-protocol.md.
 *
 * basic-ftp uses passive mode and binary transfers by default, matching bpost's required
 * FTP client configuration (Table 4 in the protocol doc).
 *
 * @param xml MailingRequest XML. Encoded as ISO-8859-1 before upload.
 * @param fileName Final remote name. Must end in `.xml` or `.txt`. Uploaded as `.TMP`, then renamed.
 * @param credentials FTP host and login.
 * @param options Optional debug transcript for onboarding / Connection & Security Test.
 * @returns The final remote file name and the number of bytes sent.
 * @throws {FtpTransportError} On a bad file name or a failed transfer.
 */
export async function sendXmlViaFtp(
  xml: string,
  fileName: string,
  credentials: FtpCredentials,
  options: FtpUploadOptions = {},
): Promise<FtpUploadResult> {
  if (!/\.(xml|txt)$/i.test(fileName)) {
    throw new FtpTransportError(`Bestandsnaam moet op .xml of .txt eindigen, kreeg: ${fileName}`)
  }
  const tmpName = fileName.replace(/\.(xml|txt)$/i, '.TMP')
  const log = options.debug
    ? (options.log ?? ((line: string) => console.log(line)))
    : options.log

  const step = (label: string) => {
    log?.(`[ftp] ${label}`)
  }

  const client = new Client()
  if (options.debug) {
    client.ftp.verbose = true
    client.ftp.log = (message: string) => {
      log?.(message)
    }
  }

  try {
    step(
      `access host=${credentials.host} secure=${credentials.secure} user=${maskUser(credentials.username)}`,
    )
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      secure: credentials.secure,
      // bpost's server leaves its intermediate certificate out of the TLS handshake.
      secureOptions: credentials.secure ? bpostFtpTlsOptions() : undefined,
    })
    step('access OK — login + default settings (TYPE I, PBSZ 0, PROT P when FTPS)')

    step('cd requests')
    await client.cd('requests')
    step('cd requests OK')

    // bpost's MailingRequest XML declares ISO-8859-1 (src/lib/xml.ts) — encode accordingly.
    const buffer = Buffer.from(xml, 'latin1')
    step(`uploadFrom ${tmpName} (${buffer.byteLength} bytes, latin1)`)
    await client.uploadFrom(Readable.from(buffer), tmpName)
    step(`uploadFrom OK — rename ${tmpName} → ${fileName}`)
    await client.rename(tmpName, fileName)
    step(`rename OK — remote file ready: ${fileName}`)

    return { remoteFileName: fileName, bytesSent: buffer.byteLength }
  } catch (err) {
    const detail = formatFtpError(err)
    step(`FAILED: ${detail}`)
    throw new FtpTransportError(`FTP-upload naar bpost mislukt: ${detail}`, err)
  } finally {
    client.close()
    step('connection closed')
  }
}

function maskUser(username: string): string {
  if (username.length <= 3) return '***'
  return `${username.slice(0, 2)}…${username.slice(-1)}`
}

function formatFtpError(err: unknown): string {
  if (!(err instanceof Error)) return String(err)
  const withCode = err as Error & { code?: string | number }
  const parts = [err.message]
  if (withCode.code !== undefined) parts.push(`code=${withCode.code}`)
  if (err.cause instanceof Error) parts.push(`cause=${err.cause.message}`)
  return parts.join(' | ')
}

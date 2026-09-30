// src/core/masspost/transport/ftp.ts
import { Client } from 'basic-ftp'
import { Readable } from 'node:stream'
import type { FtpCredentials } from '../credentials'

export interface FtpUploadResult {
  remoteFileName: string
  bytesSent: number
}

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
 */
export async function sendXmlViaFtp(
  xml: string,
  fileName: string,
  credentials: FtpCredentials,
): Promise<FtpUploadResult> {
  if (!/\.(xml|txt)$/i.test(fileName)) {
    throw new FtpTransportError(`Bestandsnaam moet op .xml of .txt eindigen, kreeg: ${fileName}`)
  }
  const tmpName = fileName.replace(/\.(xml|txt)$/i, '.TMP')

  const client = new Client()
  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      secure: credentials.secure,
    })

    await client.cd('requests')

    // bpost's MailingRequest XML declares ISO-8859-1 (src/lib/xml.ts) — encode accordingly.
    const buffer = Buffer.from(xml, 'latin1')
    await client.uploadFrom(Readable.from(buffer), tmpName)
    await client.rename(tmpName, fileName)

    return { remoteFileName: fileName, bytesSent: buffer.byteLength }
  } catch (err) {
    throw new FtpTransportError(`FTP-upload naar bpost mislukt: ${(err as Error).message}`, err)
  } finally {
    client.close()
  }
}

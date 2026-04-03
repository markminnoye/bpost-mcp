// src/client/bpost.ts
import { parseXml } from '@/lib/xml'
import { parseBpostError, BpostError } from './errors'

const BPOST_ENDPOINT = 'https://www.bpost.be/emasspost'

interface BpostClientConfig {
  username: string
  password: string
  endpoint?: string
}

export class BpostClient {
  private readonly endpoint: string
  private readonly authHeader: string

  constructor(config: BpostClientConfig) {
    this.endpoint = config.endpoint ?? BPOST_ENDPOINT
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
  }

  async sendDepositRequest(xmlPayload: string): Promise<Record<string, unknown>> {
    return this.post(xmlPayload)
  }

  async sendMailingRequest(xmlPayload: string): Promise<Record<string, unknown>> {
    return this.post(xmlPayload)
  }

  private async post(xmlPayload: string): Promise<Record<string, unknown>> {
    let response: Response

    try {
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml; charset=ISO-8859-1',
          'Authorization': this.authHeader,
        },
        body: xmlPayload,
      })
    } catch (err) {
      throw parseBpostError('NETWORK_TIMEOUT', (err as Error).message)
    }

    const text = await response.text()

    if (!response.ok) {
      // Try to extract BPost error code from XML response body
      const parsed = parseXml<Record<string, unknown>>(text)
      const errorEl = (parsed as Record<string, unknown>)['Error'] as Record<string, unknown> | undefined
      const code = (errorEl?.['@_code'] as string) ?? `HTTP_${response.status}`
      const message = typeof errorEl === 'object'
        ? String((errorEl as Record<string, unknown>)['#text'] ?? 'Unknown error')
        : 'Unknown error'
      throw parseBpostError(code, message)
    }

    return parseXml<Record<string, unknown>>(text)
  }
}

/** Factory: builds BpostClient from explicit credentials */
export function createBpostClient(credentials: { username: string; password: string }): BpostClient {
  return new BpostClient(credentials)
}

import { describe, it, expect } from 'vitest'
import { X509Certificate } from 'node:crypto'
import { rootCertificates } from 'node:tls'
import {
  BPOST_FTP_INTERMEDIATE_CA,
  BPOST_FTP_INTERMEDIATE_SHA256,
  bpostFtpTlsOptions,
} from '@/core/masspost/transport/bpost-ca'

describe('bpost FTPS intermediate certificate', () => {
  const intermediate = new X509Certificate(BPOST_FTP_INTERMEDIATE_CA)

  it('is the GEANT TLS RSA 1 intermediate with the pinned fingerprint', () => {
    expect(intermediate.subject).toContain('CN=GEANT TLS RSA 1')
    expect(intermediate.ca).toBe(true)
    expect(intermediate.fingerprint256).toBe(BPOST_FTP_INTERMEDIATE_SHA256)
  })

  it('is signed by a root that Node already trusts, so it adds no new root of trust', () => {
    const root = rootCertificates
      .map((pem) => new X509Certificate(pem))
      .find((candidate) => intermediate.checkIssued(candidate) && intermediate.verify(candidate.publicKey))
    expect(root?.subject).toContain('CN=HARICA TLS RSA Root CA 2021')
  })

  it('is still valid', () => {
    expect(new Date(intermediate.validTo).getTime()).toBeGreaterThan(Date.now())
  })

  it('is added to Node\'s default roots instead of replacing them', () => {
    const { ca } = bpostFtpTlsOptions()
    expect(Array.isArray(ca)).toBe(true)
    expect(ca).toContain(BPOST_FTP_INTERMEDIATE_CA)
    expect((ca as string[]).length).toBe(rootCertificates.length + 1)
  })
})

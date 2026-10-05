// scripts/test-transport.ts
//
// Proves today's milestone (28/09/2026): Excel -> validated MailingRequest XML -> sent to bpost
// test-mode via HTTP, and via FTP. Full docs: docs/internal/masspost-library.md
//
//   npm run test:transport                 # Contrapunt sample xlsx (default), HTTP only
//   npm run test:transport -- --ftp        # sample + FTP
//   npm run test:transport -- --ftp --debug   # FTP with full protocol transcript + preflight
//   npm run test:transport -- --ftp-only --debug --synthetic
//   npm run test:transport -- --synthetic  # one fake address instead of the sample file
//   npm run test:transport -- --file path/to/list.xlsx
//
// Requires BPOST_TEST_USERNAME / BPOST_TEST_PASSWORD / BPOST_TEST_CUSTOMER_ID /
// BPOST_TEST_ACCOUNT_ID in .env.local (and BPOST_FTP_* for --ftp). See src/lib/config/env.ts.
//
// bpost rate limit: max 1 outbound FTP connection initiation per 5 minutes — avoid re-running
// --ftp in a tight loop during Connection & Security Test.
import { xlsxBuffer } from '../src/core/masspost/fixtures/xlsx'
import { convertExcelToMailingRequest } from '../src/core/masspost/pipeline'
import { getHttpCredentials, getFtpCredentials, MissingCredentialsError } from '../src/core/masspost/credentials'
import { sendMailingRequestViaHttp } from '../src/core/masspost/transport/http'
import { sendXmlViaFtp } from '../src/core/masspost/transport/ftp'
import { buildMailingRequestFileName } from '../src/core/masspost/file-naming'
import type { BuildRequestParams } from '../src/core/masspost/build-request'
import {
  CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { lookup } from 'node:dns/promises'
import { connect as tlsConnect } from 'node:tls'
import { connect as netConnect } from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'

const execFileAsync = promisify(execFile)

async function buildSyntheticFixture(): Promise<Buffer> {
  return xlsxBuffer(
    [
      ['Naam', 'Straat', 'Nummer', 'Postcode', 'Gemeente'],
      ['Contrapunt Test', 'P. Nollekensstraat', '95', '3010', 'Kessel-Lo'],
    ],
    'Adressen',
  )
}

const SYNTHETIC_MAPPING = {
  name: ['Naam'],
  streetHouseBox: ['Straat', 'Nummer'],
  postcodeCity: ['Postcode', 'Gemeente'],
} as const

type ReportLine = string

async function fetchPublicIp(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return `(ipify HTTP ${res.status})`
    const body = (await res.json()) as { ip?: string }
    return body.ip ?? '(geen ip in response)'
  } catch (err) {
    return `(ipify mislukt: ${(err as Error).message})`
  }
}

async function probeTcp(host: string, port: number, timeoutMs = 8_000): Promise<string> {
  return new Promise((resolve) => {
    const socket = netConnect({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(`TIMEOUT na ${timeoutMs}ms`)
    }, timeoutMs)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket.end()
      resolve('OK (TCP connect)')
    })
    socket.once('error', (err) => {
      clearTimeout(timer)
      resolve(`FAIL: ${err.message}`)
    })
  })
}

/** Explicit FTPS handshake probe: plain TCP → AUTH TLS → certificate summary (no login). */
async function probeExplicitFtps(host: string, port = 21): Promise<string[]> {
  const lines: string[] = []
  return new Promise((resolve) => {
    const socket = netConnect({ host, port })
    let buffer = ''
    let phase: 'greeting' | 'auth' | 'tls' | 'done' = 'greeting'
    const finish = (extra?: string) => {
      if (phase === 'done') return
      phase = 'done'
      if (extra) lines.push(extra)
      socket.destroy()
      resolve(lines)
    }
    const timer = setTimeout(() => finish('FTPS-probe TIMEOUT (8s)'), 8_000)

    socket.setEncoding('utf8')
    socket.on('data', (chunk: string) => {
      buffer += chunk
      const msgs = buffer.split(/\r?\n/).filter(Boolean)
      // keep incomplete trailing line in buffer
      if (!buffer.endsWith('\n') && !buffer.endsWith('\r')) {
        buffer = msgs.pop() ?? ''
      } else {
        buffer = ''
      }
      for (const msg of msgs) {
        lines.push(`<< ${msg}`)
        if (phase === 'greeting' && /^220\b/.test(msg)) {
          phase = 'auth'
          socket.write('AUTH TLS\r\n')
          lines.push('>> AUTH TLS')
        } else if (phase === 'auth' && /^234\b/.test(msg)) {
          phase = 'tls'
          const tlsSock = tlsConnect({
            socket,
            servername: host,
            rejectUnauthorized: true,
          })
          tlsSock.once('secureConnect', () => {
            clearTimeout(timer)
            const cert = tlsSock.getPeerCertificate(true)
            lines.push(`TLS authorized=${tlsSock.authorized}`)
            if (tlsSock.authorizationError) {
              lines.push(`TLS authorizationError=${tlsSock.authorizationError.message}`)
            }
            lines.push(`TLS protocol=${tlsSock.getProtocol()}`)
            lines.push(`TLS cipher=${tlsSock.getCipher()?.name ?? '?'}`)
            if (cert && Object.keys(cert).length > 0) {
              lines.push(`cert.subject=${JSON.stringify(cert.subject)}`)
              lines.push(`cert.issuer=${JSON.stringify(cert.issuer)}`)
              lines.push(`cert.valid_from=${cert.valid_from}`)
              lines.push(`cert.valid_to=${cert.valid_to}`)
              lines.push(`cert.fingerprint256=${cert.fingerprint256}`)
            }
            tlsSock.end()
            finish()
          })
          tlsSock.once('error', (err) => {
            clearTimeout(timer)
            finish(`TLS handshake FAIL: ${err.message}`)
          })
        } else if (phase === 'auth' && /^5\d\d\b/.test(msg)) {
          clearTimeout(timer)
          finish(`AUTH TLS geweigerd: ${msg}`)
        }
      }
    })
    socket.once('error', (err) => {
      clearTimeout(timer)
      finish(`TCP/FTPS-probe FAIL: ${err.message}`)
    })
  })
}

async function opensslStartTlsDump(host: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      'openssl',
      ['s_client', '-starttls', 'ftp', '-connect', `${host}:21`, '-servername', host, '-showcerts'],
      { timeout: 12_000, maxBuffer: 2_000_000 },
    )
    // openssl writes the PEM + summary mostly to stdout; connect noise often on stderr
    const text = `${stdout}\n${stderr}`
    const keep = text
      .split('\n')
      .filter((l) =>
        /BEGIN CERTIFICATE|END CERTIFICATE|subject=|issuer=|Verify return code|Certificate chain|depth=|Protocol|Cipher/.test(
          l,
        ),
      )
      .join('\n')
    return keep || '(openssl gaf geen parseerbare cert-regels)'
  } catch (err) {
    const e = err as Error & { stdout?: string; stderr?: string }
    const combined = `${e.stdout ?? ''}\n${e.stderr ?? ''}\n${e.message}`
    const verifyLine = combined
      .split('\n')
      .filter((l) => /Verify return code|unable to|error:|subject=|issuer=/.test(l))
      .join('\n')
    return verifyLine || `openssl mislukt: ${e.message}`
  }
}

async function runFtpPreflight(host: string, report: ReportLine[]): Promise<void> {
  report.push('## Preflight')
  report.push(`- timestamp (UTC): ${new Date().toISOString()}`)
  const publicIp = await fetchPublicIp()
  report.push(`- egress public IP (ipify): ${publicIp}`)
  report.push(`- FTP host (DNS name): ${host}`)

  try {
    const addresses = await lookup(host, { all: true })
    for (const a of addresses) {
      report.push(`- DNS A/AAAA: ${a.address} (${a.family === 4 ? 'IPv4' : 'IPv6'})`)
    }
  } catch (err) {
    report.push(`- DNS lookup FAIL: ${(err as Error).message}`)
  }

  report.push(`- TCP :21 → ${await probeTcp(host, 21)}`)
  report.push('- Explicit FTPS probe (AUTH TLS + cert, zonder login):')
  const ftpsLines = await probeExplicitFtps(host)
  for (const line of ftpsLines) report.push(`  ${line}`)

  report.push('- openssl s_client -starttls ftp (cert chain / verify):')
  const opensslOut = await opensslStartTlsDump(host)
  for (const line of opensslOut.split('\n')) {
    if (line.trim()) report.push(`  ${line}`)
  }
  report.push('')
  report.push(
    'Note: bpost requires a fixed IP whitelist and a completed Connection & Security Test (FTP Only).',
  )
  report.push('Rate limit: max 1 outbound connection initiation per 5 minutes.')
  report.push('')
}

async function main() {
  const args = process.argv.slice(2)
  const wantsFtp = args.includes('--ftp') || args.includes('--ftp-only')
  const ftpOnly = args.includes('--ftp-only')
  const debug = args.includes('--debug')
  const useSynthetic = args.includes('--synthetic')
  const fileArgIdx = args.indexOf('--file')
  const filePathArg = fileArgIdx >= 0 ? args[fileArgIdx + 1] : undefined

  const report: ReportLine[] = []
  const transcript: string[] = []
  const pushBoth = (line: string) => {
    console.log(line)
    report.push(line)
  }

  console.log('=== bpost masspost transport proof ===\n')
  report.push('# bpost FTP / transport debug report')
  report.push('')
  report.push('Generated by `npm run test:transport`. Safe to forward to bpost (no passwords).')
  report.push('')

  let filePath: string | undefined
  let mapping = CONTRAPUNT_SAMPLE_COLUMN_MAPPING

  if (useSynthetic) {
    filePath = undefined
    mapping = SYNTHETIC_MAPPING
    console.log('Modus: synthetisch enkel testadres.\n')
  } else if (filePathArg) {
    filePath = filePathArg
    console.log(`Bestand: ${filePath}\n`)
  } else {
    filePath = CONTRAPUNT_TEST_ADRESSEN_XLSX
    try {
      await access(filePath)
      console.log(`Referentie-export: ${filePath}\n`)
    } catch {
      console.warn(`Referentiebestand niet gevonden (${filePath}), val terug op synthetisch adres.\n`)
      filePath = undefined
      mapping = SYNTHETIC_MAPPING
    }
  }

  const { readFile } = await import('node:fs/promises')
  const buffer = filePath ? await readFile(filePath) : await buildSyntheticFixture()

  let httpCreds
  try {
    httpCreds = getHttpCredentials()
  } catch (err) {
    if (err instanceof MissingCredentialsError) {
      console.error(`❌ ${err.message}`)
      process.exit(1)
    }
    throw err
  }

  const now = new Date()
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const params: BuildRequestParams = {
    mailingRef: `TRANSPORT${stamp}`.slice(0, 20),
    expectedDeliveryDate: new Date(now.getTime() + 3 * 86400000).toISOString().slice(0, 10),
    format: 'Large',
    priority: 'NP',
    mode: 'T', // test mode — never production from this script
    customerFileRef: httpCreds.customerFileRef.slice(0, 10),
    genMID: 'N',
    genPSC: 'N',
  }

  const result = await convertExcelToMailingRequest(
    buffer,
    mapping,
    params,
    {
      customerId: httpCreds.customerId,
      accountId: httpCreds.accountId,
      midVersion: httpCreds.midVersion,
    },
  )

  console.log(`Adressen verwerkt: ${result.itemCount}`)
  report.push('## Request build')
  report.push(`- itemCount: ${result.itemCount}`)
  report.push(`- customerId: ${httpCreds.customerId}`)
  report.push(`- accountId: ${httpCreds.accountId}`)
  report.push(`- midVersion: ${httpCreds.midVersion}`)
  report.push(`- customerFileRef: ${httpCreds.customerFileRef}`)
  report.push(`- mailingRef: ${params.mailingRef}`)
  report.push(`- mode: ${params.mode}`)

  if (result.warnings.length > 0) {
    console.log(`Waarschuwingen (${result.warnings.length}):`)
    result.warnings.forEach((w) => console.log(`  - seq ${w.seq} [${w.field}]: ${w.message}`))
  }

  if (!result.validation.valid) {
    console.error('\n❌ Validatie mislukt:')
    result.validation.issues.forEach((i) => console.error(`  - ${i.path}: ${i.message}`))
    process.exit(1)
  }
  console.log('\n✅ Validatie geslaagd.\n')
  report.push('- validation: OK')
  report.push('')

  const bpostFileName = buildMailingRequestFileName({
    senderId: httpCreds.customerId,
    customerFileRef: httpCreds.customerFileRef,
    version: httpCreds.midVersion,
    generatedAt: now,
  })
  report.push(`- canonical remote filename: ${bpostFileName}`)
  report.push('')

  // ── HTTP ──────────────────────────────────────────────────────────────
  if (!ftpOnly) {
    console.log('--- HTTP ---')
    try {
      const response = await sendMailingRequestViaHttp(result.validation.data!, httpCreds)
      console.log('✅ HTTP-verzending geslaagd. bpost-respons:')
      console.log(JSON.stringify(response, null, 2))
    } catch (err) {
      console.error('❌ HTTP-verzending mislukt:', (err as Error).message)
      report.push('## HTTP')
      report.push(`- result: FAIL`)
      report.push(`- error: ${(err as Error).message}`)
      report.push('')
    }
  } else {
    console.log('(HTTP overgeslagen — --ftp-only)\n')
  }

  // ── FTP ───────────────────────────────────────────────────────────────
  if (wantsFtp) {
    console.log('\n--- FTP ---')
    try {
      const ftpCreds = getFtpCredentials()
      report.push('## FTP session config')
      report.push(`- host: ${ftpCreds.host}`)
      report.push(`- secure (FTPS explicit): ${ftpCreds.secure}`)
      report.push(`- username: ${ftpCreds.username.slice(0, 2)}… (masked)`)
      report.push(`- password: (not logged)`)
      report.push(`- remote path: /requests`)
      report.push(`- upload procedure: .TMP then rename to final .XML`)
      report.push(`- transfer: passive + binary (basic-ftp defaults)`)
      report.push('')

      if (debug) {
        await runFtpPreflight(ftpCreds.host, report)
        console.log('\n--- FTP preflight (zie ook rapportbestand) ---')
        report
          .filter((l) => l.startsWith('- ') || l.startsWith('  '))
          .slice(-40)
          .forEach((l) => console.log(l))
        console.log('\n--- FTP protocol transcript ---')
      }

      const upload = await sendXmlViaFtp(result.xml!, bpostFileName, ftpCreds, {
        debug,
        log: (line) => {
          transcript.push(line)
          console.log(line)
        },
      })
      pushBoth(`✅ FTP-upload geslaagd: ${upload.remoteFileName} (${upload.bytesSent} bytes).`)
      report.push('## FTP result')
      report.push('- status: SUCCESS')
      report.push(`- remoteFileName: ${upload.remoteFileName}`)
      report.push(`- bytesSent: ${upload.bytesSent}`)
      report.push(
        '- next: poll \\responses for acknowledgement / response (not automated in this script).',
      )
    } catch (err) {
      if (err instanceof MissingCredentialsError) {
        console.error(`❌ ${err.message}`)
        report.push(`## FTP result\n- status: FAIL\n- error: ${err.message}`)
      } else {
        const message = (err as Error).message
        console.error('❌ FTP-verzending mislukt:', message)
        report.push('## FTP result')
        report.push('- status: FAIL')
        report.push(`- error: ${message}`)
        const cause = (err as Error & { cause?: unknown }).cause
        if (cause instanceof Error) {
          report.push(`- cause: ${cause.message}`)
          const withCode = cause as Error & { code?: string | number }
          if (withCode.code !== undefined) report.push(`- cause.code: ${withCode.code}`)
        }
      }
    }

    if (transcript.length > 0) {
      report.push('')
      report.push('## FTP protocol transcript')
      report.push('```')
      report.push(...transcript)
      report.push('```')
    }

    const outDir = path.join('docs/samples/contrapunt/generated')
    await mkdir(outDir, { recursive: true })
    const reportName = `ftp-debug-${stamp}.md`
    const reportPath = path.join(outDir, reportName)
    await writeFile(reportPath, `${report.join('\n')}\n`, 'utf8')
    console.log(`\n📄 Debug-rapport (doorstuurbaar naar bpost): ${reportPath}`)
  } else {
    console.log('\n(FTP overgeslagen — voeg --ftp toe om ook FTP te testen; --debug voor transcript.)')
  }
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})

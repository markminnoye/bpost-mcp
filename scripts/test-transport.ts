// scripts/test-transport.ts
//
// Proves today's milestone (28/09/2026): Excel -> validated MailingRequest XML -> sent to bpost
// test-mode via HTTP, and via FTP. Full docs: docs/internal/masspost-library.md
//
//   npm run test:transport                 # Contrapunt sample xlsx (default), HTTP only
//   npm run test:transport -- --ftp        # sample + FTP
//   npm run test:transport -- --synthetic  # one fake address instead of the sample file
//   npm run test:transport -- --file path/to/list.xlsx
//
// Requires BPOST_TEST_USERNAME / BPOST_TEST_PASSWORD / BPOST_TEST_CUSTOMER_ID /
// BPOST_TEST_ACCOUNT_ID in .env.local (and BPOST_FTP_* for --ftp). See src/lib/config/env.ts.
import ExcelJS from 'exceljs'
import { convertExcelToMailingRequest } from '../src/core/masspost/pipeline'
import { getHttpCredentials, getFtpCredentials, MissingCredentialsError } from '../src/core/masspost/credentials'
import { sendMailingRequestViaHttp } from '../src/core/masspost/transport/http'
import { sendXmlViaFtp } from '../src/core/masspost/transport/ftp'
import type { BuildRequestParams } from '../src/core/masspost/build-request'
import {
  CONTRAPUNT_EXPORT_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import { access } from 'node:fs/promises'

async function buildSyntheticFixture(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Adressen')
  sheet.addRow(['Naam', 'Straat', 'Nummer', 'Postcode', 'Gemeente'])
  sheet.addRow(['Contrapunt Test', 'P. Nollekensstraat', '95', '3010', 'Kessel-Lo'])
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

const SYNTHETIC_MAPPING = {
  name: ['Naam'],
  streetHouseBox: ['Straat', 'Nummer'],
  postcodeCity: ['Postcode', 'Gemeente'],
} as const

async function main() {
  const args = process.argv.slice(2)
  const wantsFtp = args.includes('--ftp')
  const useSynthetic = args.includes('--synthetic')
  const fileArgIdx = args.indexOf('--file')
  const filePathArg = fileArgIdx >= 0 ? args[fileArgIdx + 1] : undefined

  console.log('=== bpost masspost transport proof ===\n')

  let filePath: string | undefined
  let mapping = CONTRAPUNT_EXPORT_COLUMN_MAPPING

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

  // ── HTTP ──────────────────────────────────────────────────────────────
  console.log('--- HTTP ---')
  try {
    const response = await sendMailingRequestViaHttp(result.validation.data!, httpCreds)
    console.log('✅ HTTP-verzending geslaagd. bpost-respons:')
    console.log(JSON.stringify(response, null, 2))
  } catch (err) {
    console.error('❌ HTTP-verzending mislukt:', (err as Error).message)
  }

  // ── FTP ───────────────────────────────────────────────────────────────
  if (wantsFtp) {
    console.log('\n--- FTP ---')
    try {
      const ftpCreds = getFtpCredentials()
      const fileName = `${params.mailingRef}.XML`
      const upload = await sendXmlViaFtp(result.xml!, fileName, ftpCreds)
      console.log(`✅ FTP-upload geslaagd: ${upload.remoteFileName} (${upload.bytesSent} bytes).`)
      console.log('Let op: dit bewijst enkel de upload naar \\requests. Het antwoordbestand in')
      console.log('\\responses moet nog apart opgehaald en gelezen worden (volgende stap).')
    } catch (err) {
      if (err instanceof MissingCredentialsError) {
        console.error(`❌ ${err.message}`)
      } else {
        console.error('❌ FTP-verzending mislukt:', (err as Error).message)
      }
    }
  } else {
    console.log('\n(FTP overgeslagen — voeg --ftp toe om ook FTP te testen.)')
  }
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})

// scripts/generate-mailing-xml.ts
//
// Build a validated MailingRequest XML from the Contrapunt sample xlsx for manual upload
// on https://www.bpost.be/emasspost (test mode). Does not call HTTP/FTP.
// Env (MID version, file ref, ids): docs/internal/masspost-test-env.md
//
//   npm run generate:mailing-xml                    # MailingCreate, max 200 (mode=T)
//   npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx
//   npm run generate:mailing-xml -- --simple
//   npm run generate:mailing-xml -- --limit 50
//   npm run generate:mailing-xml -- --opti --limit 10   # OptiAddress (MailingCheck)
//   npm run generate:mailing-xml -- --all
//   npm run generate:mailing-xml -- --out ./mijn-bestand.xml
//
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  convertExcelToMailingCheck,
  convertExcelToMailingRequest,
} from '../src/core/masspost/pipeline'
import {
  getHttpCredentials,
  MissingCredentialsError,
  type MidProtocolVersion,
} from '../src/core/masspost/credentials'
import {
  CONTRAPUNT_EXPORT_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
  buildSimpleContrapuntTestXlsxBuffer,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import { buildMailingRequestFileName } from '../src/core/masspost/file-naming'
import type { BuildCheckParams, BuildRequestParams } from '../src/core/masspost/build-request'

const DEFAULT_OUT_DIR = path.join(process.cwd(), 'docs/samples/contrapunt/generated')
/** bpost Header mode=T: treatment limited to 200 addresses (Technical Guide). */
const TEST_MODE_MAX_ITEMS = 200
const MID_VERSIONS = new Set<MidProtocolVersion>(['0100', '0102', '0200'])

function parseVersionOverride(args: string[]): MidProtocolVersion | undefined {
  const idx = args.indexOf('--version')
  if (idx < 0) return undefined
  const raw = args[idx + 1]
  if (!raw || !MID_VERSIONS.has(raw as MidProtocolVersion)) {
    console.error(`❌ --version vereist 0100 | 0102 | 0200 (kreeg: ${raw ?? '(leeg)'})`)
    process.exit(1)
  }
  return raw as MidProtocolVersion
}

/** Undefined = no cap. Default for portal test uploads: 200. */
function parseLimit(args: string[]): number | undefined {
  if (args.includes('--all')) return undefined
  const idx = args.indexOf('--limit')
  if (idx < 0) return TEST_MODE_MAX_ITEMS
  const raw = args[idx + 1]
  const n = Number(raw)
  if (!raw || !Number.isInteger(n) || n < 1) {
    console.error(`❌ --limit vereist een positief geheel getal (kreeg: ${raw ?? '(leeg)'})`)
    process.exit(1)
  }
  return n
}

async function main() {
  const args = process.argv.slice(2)
  const useSimple = args.includes('--simple')
  const useOpti = args.includes('--opti') || args.includes('--check')
  const fileIdx = args.indexOf('--file')
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : undefined
  if (fileIdx >= 0 && !filePath) {
    console.error('❌ --file vereist een pad naar een .xlsx')
    process.exit(1)
  }
  if (useSimple && filePath) {
    console.error('❌ --simple en --file sluiten elkaar uit')
    process.exit(1)
  }
  const versionOverride = parseVersionOverride(args)
  const maxItems = useSimple ? undefined : parseLimit(args)
  const outIdx = args.indexOf('--out')
  const explicitOut = outIdx >= 0 ? args[outIdx + 1] : undefined

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

  const midVersion = versionOverride ?? httpCreds.midVersion

  const sourcePath = filePath ? path.resolve(filePath) : CONTRAPUNT_TEST_ADRESSEN_XLSX
  const buffer = useSimple ? await buildSimpleContrapuntTestXlsxBuffer() : await readFile(sourcePath)
  const sourceLabel = useSimple
    ? 'synthetisch testadres (1 rij, Contrapunt-kolomlayout)'
    : sourcePath

  const now = new Date()
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const creds = {
    customerId: httpCreds.customerId,
    accountId: httpCreds.accountId,
    midVersion,
    maxItems,
  }

  const result = useOpti
    ? await convertExcelToMailingCheck(
        buffer,
        CONTRAPUNT_EXPORT_COLUMN_MAPPING,
        {
          mailingRef: (useSimple ? `OPTISIMPLE${stamp}` : `OPTI${stamp}`).slice(0, 20),
          priority: 'NP',
          mode: 'T',
          customerFileRef: httpCreds.customerFileRef,
          copyRequestItem: 'Y',
          suggestionsCount: 5,
          suggestionsMinScore: 60,
        } satisfies BuildCheckParams,
        creds,
      )
    : await convertExcelToMailingRequest(
        buffer,
        CONTRAPUNT_EXPORT_COLUMN_MAPPING,
        {
          mailingRef: (useSimple ? `SIMPLE${stamp}` : `MANUAL${stamp}`).slice(0, 20),
          expectedDeliveryDate: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10),
          format: 'Large',
          priority: 'NP',
          mode: 'T',
          customerFileRef: httpCreds.customerFileRef,
          genMID: '7',
          genPSC: 'N',
        } satisfies BuildRequestParams,
        creds,
      )

  console.log(
    useOpti
      ? '=== MailingCheck XML (OptiAddress) ===\n'
      : '=== MailingRequest XML (MailingCreate) ===\n',
  )
  console.log(`Bron: ${sourceLabel}`)
  if (result.sourceItemCount !== result.itemCount) {
    console.log(
      `Adressen: ${result.itemCount} (van ${result.sourceItemCount} — limiet mode=T / --limit)`,
    )
  } else {
    console.log(`Adressen: ${result.itemCount}`)
  }
  if (result.warnings.length > 0) {
    console.log(`Waarschuwingen: ${result.warnings.length} (zie pipeline)`)
  }

  if (!result.validation.valid || !result.xml) {
    console.error('\n❌ Validatie mislukt:')
    result.validation.issues.forEach((i) => console.error(`  - ${i.path}: ${i.message}`))
    process.exit(1)
  }

  if (!useOpti && result.itemCount > TEST_MODE_MAX_ITEMS) {
    console.warn(
      `\n⚠️  mode=T mag max ${TEST_MODE_MAX_ITEMS} adressen (Technical Guide). Dit bestand heeft ${result.itemCount}.`,
    )
  }

  const bpostFileName = buildMailingRequestFileName({
    senderId: httpCreds.customerId,
    customerFileRef: httpCreds.customerFileRef,
    version: midVersion,
    generatedAt: now,
  })

  let outPath: string
  if (explicitOut) {
    outPath = path.resolve(explicitOut)
  } else {
    await mkdir(DEFAULT_OUT_DIR, { recursive: true })
    outPath = path.join(DEFAULT_OUT_DIR, bpostFileName)
  }

  await writeFile(outPath, result.xml, 'latin1')

  const uploadBaseName = path.basename(outPath)
  if (explicitOut && uploadBaseName !== bpostFileName) {
    console.warn(
      `\n⚠️  Upload in het portaal moet exact heten: ${bpostFileName}\n` +
        `   (je schreef naar "${uploadBaseName}" — hernoem of gebruik zonder --out)\n`,
    )
  }

  console.log('\n✅ XML geschreven.')
  console.log(`   Pad: ${outPath}`)
  console.log(`   Bestandsnaam (bpost): ${bpostFileName}`)
  console.log(
    useOpti
      ? `   actie: MailingCheck (OptiAddress) | copyRequestItem=Y | suggestionsCount=5`
      : `   actie: MailingCreate | genMID=7`,
  )
  console.log(`   mode: T (test)`)
  console.log(
    `   customerId: ${httpCreds.customerId} | accountId: ${httpCreds.accountId} | midVersion: ${midVersion}` +
      (versionOverride ? ' (via --version)' : ''),
  )
  if (useOpti) {
    console.log(
      '\nUpload als mailing request (zelfde MID_…_0RQ.XML). Alleen MailingCheck in het bestand — geen Create ernaast.',
    )
  } else {
    console.log('\nUpload op e-MassPost: structured file / mailing request, test-modus.')
  }
  console.log('Encoding: ISO-8859-1 (Latin-1), zoals in de XML-declaratie.')
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})

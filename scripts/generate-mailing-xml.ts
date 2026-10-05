// scripts/generate-mailing-xml.ts
//
// Build a validated MailingRequest XML from the Contrapunt sample xlsx for manual upload
// on https://www.bpost.be/emasspost (test mode). Does not call HTTP/FTP.
// Full flag table: docs/internal/masspost-library.md
// Env (MID version, file ref, ids): docs/internal/masspost-test-env.md
//
//   npm run generate:mailing-xml                    # MailingCreate, max 200 (mode=T)
//   npm run generate:mailing-xml -- --file docs/samples/contrapunt/testadressen-200.xlsx
//   npm run generate:mailing-xml -- --simple
//   npm run generate:mailing-xml -- --limit 50
//   npm run generate:mailing-xml -- --opti --limit 10   # OptiAddress (MailingCheck)
//   npm run generate:mailing-xml -- --all
//   npm run generate:mailing-xml -- --out ./mijn-bestand.xml
//   npm run generate:mailing-xml -- --version 0200
//   npm run generate:mailing-xml -- --mode C --limit 500            # Certification mode (limit ≤ 2000)
//   npm run generate:mailing-xml -- --opti --mode P --confirm-production --limit 10   # PRODUCTION
//   npm run generate:mailing-xml -- --delete MANUAL20261001120000   # MailingDelete (no Excel)
//   npm run generate:mailing-xml -- --reuse MANUAL20261001120000 --deposit DEPOSIT1 [--ref REUSE1]
//
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  convertExcelToMailingCheck,
  convertExcelToMailingRequest,
} from '../src/core/masspost/pipeline'
import {
  buildMailingDeleteRequest,
  buildMailingReuseRequest,
} from '../src/core/masspost/build-request'
import { validateMailingRequest } from '../src/core/masspost/validate'
import { buildXml } from '../src/lib/xml'
import {
  getHttpCredentials,
  MissingCredentialsError,
  type MidProtocolVersion,
} from '../src/core/masspost/credentials'
import {
  CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
  buildSimpleContrapuntTestXlsxBuffer,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import { buildMailingRequestFileName } from '../src/core/masspost/file-naming'
import type { BuildCheckParams, BuildRequestParams } from '../src/core/masspost/build-request'

const DEFAULT_OUT_DIR = path.join(process.cwd(), 'docs/samples/contrapunt/generated')
type RequestMode = 'T' | 'C' | 'P'
const REQUEST_MODES = new Set<RequestMode>(['T', 'C', 'P'])
/** Documented bpost limits per Header mode (Technical Guide): T ≤ 200, C ≤ 2000, P none. */
const MODE_MAX_ITEMS: Record<RequestMode, number | undefined> = { T: 200, C: 2000, P: undefined }
const MID_VERSIONS = new Set<MidProtocolVersion>(['0100', '0102', '0200'])

/**
 * `--mode T|C|P` (default T). C and P lift the library's FORCE_TEST_MODE guard for this file only.
 * P is production: it needs `--confirm-production` and an explicit `--limit` or `--all`.
 */
function parseMode(args: string[]): RequestMode {
  const idx = args.indexOf('--mode')
  if (idx < 0) return 'T'
  const raw = args[idx + 1]
  if (!raw || !REQUEST_MODES.has(raw as RequestMode)) {
    console.error(`❌ --mode vereist T | C | P (kreeg: ${raw ?? '(leeg)'})`)
    process.exit(1)
  }
  const mode = raw as RequestMode
  if (mode === 'P') {
    if (!args.includes('--confirm-production')) {
      console.error('❌ --mode P is productie. Voeg --confirm-production toe als je dit bewust wilt.')
      process.exit(1)
    }
    // Delete and reuse carry no address rows, so a row cap makes no sense for them.
    const hasNoRows = args.includes('--delete') || args.includes('--reuse')
    if (!hasNoRows && !args.includes('--limit') && !args.includes('--all') && !args.includes('--simple')) {
      console.error('❌ --mode P vereist een expliciete --limit N, --all of --simple (geen stille standaardwaarde).')
      process.exit(1)
    }
  }
  return mode
}

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

/** Undefined = no cap. Default is the documented limit of the chosen mode (T: 200, C: 2000). */
function parseLimit(args: string[], mode: RequestMode): number | undefined {
  if (args.includes('--all')) return undefined
  const idx = args.indexOf('--limit')
  if (idx < 0) return MODE_MAX_ITEMS[mode]
  const raw = args[idx + 1]
  const n = Number(raw)
  if (!raw || !Number.isInteger(n) || n < 1) {
    console.error(`❌ --limit vereist een positief geheel getal (kreeg: ${raw ?? '(leeg)'})`)
    process.exit(1)
  }
  return n
}

/** Value after `flag`, or undefined when the flag is absent. Exits when the flag has no value. */
function parseValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx < 0) return undefined
  const raw = args[idx + 1]
  if (!raw || raw.startsWith('--')) {
    console.error(`❌ ${flag} vereist een waarde`)
    process.exit(1)
  }
  return raw
}

/** Writes the XML under the canonical bpost name (or `explicitOut`) and warns when the name differs. */
async function writeUploadFile(params: {
  xml: string
  explicitOut?: string
  customerId: string
  customerFileRef: string
  midVersion: MidProtocolVersion
  now: Date
}): Promise<{ outPath: string; bpostFileName: string }> {
  const bpostFileName = buildMailingRequestFileName({
    senderId: params.customerId,
    customerFileRef: params.customerFileRef,
    version: params.midVersion,
    generatedAt: params.now,
  })

  let outPath: string
  if (params.explicitOut) {
    outPath = path.resolve(params.explicitOut)
  } else {
    await mkdir(DEFAULT_OUT_DIR, { recursive: true })
    outPath = path.join(DEFAULT_OUT_DIR, bpostFileName)
  }

  await writeFile(outPath, params.xml, 'latin1')

  const uploadBaseName = path.basename(outPath)
  if (params.explicitOut && uploadBaseName !== bpostFileName) {
    console.warn(
      `\n⚠️  Upload in het portaal moet exact heten: ${bpostFileName}\n` +
        `   (je schreef naar "${uploadBaseName}" — hernoem of gebruik zonder --out)\n`,
    )
  }
  return { outPath, bpostFileName }
}

async function main() {
  const args = process.argv.slice(2)
  const deleteRef = parseValue(args, '--delete')
  const reuseSourceRef = parseValue(args, '--reuse')
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
  const mode = parseMode(args)
  const allowNonTestMode = mode !== 'T'
  const maxItems = useSimple ? undefined : parseLimit(args, mode)
  const modeMaxItems = MODE_MAX_ITEMS[mode]
  if (mode === 'P') {
    console.warn('\n⚠️  MODE P = PRODUCTIE. Upload dit bestand enkel als je dat bewust wilt.\n')
  }
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
  const now = new Date()
  const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)

  if (deleteRef || reuseSourceRef) {
    if (deleteRef && reuseSourceRef) {
      console.error('❌ --delete en --reuse sluiten elkaar uit')
      process.exit(1)
    }
    const depositIdentifier = parseValue(args, '--deposit')
    if (reuseSourceRef && !depositIdentifier) {
      console.error('❌ --reuse vereist --deposit <depositRef> (verplicht volgens de XSD)')
      process.exit(1)
    }
    const baseParams = { mode, allowNonTestMode, customerFileRef: httpCreds.customerFileRef }
    const idCreds = { customerId: httpCreds.customerId, accountId: httpCreds.accountId, midVersion }
    const request = deleteRef
      ? buildMailingDeleteRequest({ ...baseParams, mailingRef: deleteRef }, idCreds)
      : buildMailingReuseRequest(
          {
            ...baseParams,
            mailingRef: (parseValue(args, '--ref') ?? `REUSE${stamp}`).slice(0, 20),
            sourceMailingRef: reuseSourceRef!,
            depositIdentifier: depositIdentifier!,
          },
          idCreds,
        )
    const validation = validateMailingRequest(request, midVersion)
    if (!validation.valid || !validation.data) {
      console.error('\n❌ Validatie mislukt:')
      validation.issues.forEach((i) => console.error(`  - ${i.path}: ${i.message}`))
      process.exit(1)
    }
    const { outPath, bpostFileName } = await writeUploadFile({
      xml: buildXml({ MailingRequest: validation.data }),
      explicitOut,
      customerId: httpCreds.customerId,
      customerFileRef: httpCreds.customerFileRef,
      midVersion,
      now,
    })
    console.log(`=== MailingRequest XML (${deleteRef ? 'MailingDelete' : 'MailingReuse'}) ===\n`)
    console.log('✅ XML geschreven.')
    console.log(`   Pad: ${outPath}`)
    console.log(`   Bestandsnaam (bpost): ${bpostFileName}`)
    console.log(
      deleteRef
        ? `   actie: MailingDelete | mailingRef=${deleteRef}`
        : `   actie: MailingReuse | bron=${reuseSourceRef} | deposit=${depositIdentifier}`,
    )
    console.log(`   mode: ${mode} | midVersion: ${midVersion}`)
    console.log('\nUpload via de uploadtool van e-MassPost. Encoding: ISO-8859-1 (Latin-1).')
    return
  }

  const sourcePath = filePath ? path.resolve(filePath) : CONTRAPUNT_TEST_ADRESSEN_XLSX
  const buffer = useSimple ? await buildSimpleContrapuntTestXlsxBuffer() : await readFile(sourcePath)
  const sourceLabel = useSimple
    ? 'synthetisch testadres (1 rij, Contrapunt-kolomlayout)'
    : sourcePath

  const creds = {
    customerId: httpCreds.customerId,
    accountId: httpCreds.accountId,
    midVersion,
    maxItems,
  }

  const result = useOpti
    ? await convertExcelToMailingCheck(
        buffer,
        CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
        {
          mailingRef: (useSimple ? `OPTISIMPLE${stamp}` : `OPTI${stamp}`).slice(0, 20),
          priority: 'NP',
          mode,
          allowNonTestMode,
          customerFileRef: httpCreds.customerFileRef,
          copyRequestItem: 'Y',
          suggestionsCount: 5,
          suggestionsMinScore: 60,
        } satisfies BuildCheckParams,
        creds,
      )
    : await convertExcelToMailingRequest(
        buffer,
        CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
        {
          mailingRef: (useSimple ? `SIMPLE${stamp}` : `MANUAL${stamp}`).slice(0, 20),
          expectedDeliveryDate: new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10),
          format: 'Large',
          priority: 'NP',
          mode,
          allowNonTestMode,
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
      `Adressen: ${result.itemCount} (van ${result.sourceItemCount} — limiet mode=${mode} / --limit)`,
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

  if (!useOpti && modeMaxItems !== undefined && result.itemCount > modeMaxItems) {
    console.warn(
      `\n⚠️  mode=${mode} mag max ${modeMaxItems} adressen (Technical Guide). Dit bestand heeft ${result.itemCount}.`,
    )
  }

  const { outPath, bpostFileName } = await writeUploadFile({
    xml: result.xml,
    explicitOut,
    customerId: httpCreds.customerId,
    customerFileRef: httpCreds.customerFileRef,
    midVersion,
    now,
  })

  console.log('\n✅ XML geschreven.')
  console.log(`   Pad: ${outPath}`)
  console.log(`   Bestandsnaam (bpost): ${bpostFileName}`)
  console.log(
    useOpti
      ? `   actie: MailingCheck (OptiAddress) | copyRequestItem=Y | suggestionsCount=5`
      : `   actie: MailingCreate | genMID=7`,
  )
  console.log(`   mode: ${mode}`)
  console.log(
    `   customerId: ${httpCreds.customerId} | accountId: ${httpCreds.accountId} | midVersion: ${midVersion}` +
      (versionOverride ? ' (via --version)' : ''),
  )
  if (useOpti) {
    console.log(
      '\nUpload als mailing request (zelfde MID_…_0RQ.XML). Alleen MailingCheck in het bestand — geen Create ernaast.',
    )
  } else {
    console.log(`\nUpload op e-MassPost: structured file / mailing request, mode ${mode}.`)
  }
  console.log('Encoding: ISO-8859-1 (Latin-1), zoals in de XML-declaratie.')
}

main().catch((err) => {
  console.error('Onverwachte fout:', err)
  process.exit(1)
})

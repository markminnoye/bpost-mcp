// scripts/eval-ai-mapping.ts
// Measures the AI column-mapping proposal (ADR 0006) against known mappings, next to the rules.
// Calls a real model: run by hand, not in CI. Prints scores and, with --verbose, what is sent.
//
//   npm run eval:ai-mapping -- --model=mistral/mistral-small [--mask=default|no-initials|star] [--only=fr] [--pause=13000] [--verbose]
//
// --pause waits between cases (milliseconds), e.g. to stay under a gateway limit of 5 requests per minute.
//
// Model: --model, else MASSPOST_SUGGEST_MAPPING_MODEL. Auth: AI_GATEWAY_API_KEY, else VERCEL_OIDC_TOKEN
// (`vercel env pull .env.local`). All lists are fictitious or from docs/samples (public repository).
import { readFileSync } from 'node:fs'
import { parseExcelAddresses } from '../src/core/masspost/excel'
import { xlsxBuffer } from '../src/core/masspost/fixtures/xlsx'
import {
  CONTRAPUNT_AFT_200_XLS,
  CONTRAPUNT_SAMPLE_COLUMN_MAPPING,
  CONTRAPUNT_TEST_ADRESSEN_XLSX,
} from '../src/core/masspost/fixtures/contrapunt-sample'
import type { AddressField, ColumnMapping } from '../src/core/masspost/mapping'
import { maskExamples, maskValue, type MaskOptions } from '../src/core/masspost/mask'
import { suggestColumnMapping } from '../src/core/masspost/suggest-mapping'
import {
  suggestColumnRolesWithAi,
  type ColumnSample,
  type SuggestMappingLogEntry,
} from '../src/lib/masspost/suggest-mapping-ai'
import { columnExamples, columnFillCounts, type LoadedList } from '../src/app/(tools)/masspost/poc/columns'
import { demoList } from '../src/app/(tools)/masspost/poc/demo-rows'

const FIELDS: readonly AddressField[] = ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country']

interface Case {
  id: string
  list: () => Promise<LoadedList>
  /** Expected address blocks, in envelope order. Omitted blocks are expected empty. Undefined: show only. */
  expected?: Partial<ColumnMapping>
}

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? 'true'] as const
  }),
)

const MASKS: Record<string, MaskOptions | undefined> = {
  default: undefined,
  'no-initials': { initials: false },
  star: { initials: false, upper: '*', lower: '*' },
}

async function fromSheet(fileName: string, rows: unknown[][]): Promise<LoadedList> {
  return { fileName, ...(await parseExcelAddresses(xlsxBuffer(rows))) }
}

async function fromFile(filePath: string): Promise<LoadedList> {
  return { fileName: filePath, ...(await parseExcelAddresses(readFileSync(filePath))) }
}

const PEOPLE = [
  ['Jan', 'Peeters'], ['An', 'Claes'], ['Mohamed', 'El Amrani'], ['Sofie', 'Van de Velde'], ['Luc', 'Janssens'],
  ['Marie', 'Dubois'], ['Pieter', "D'Hondt"], ['Fatima', 'Benali'], ['Koen', 'Maes'], ['Els', 'Wouters'],
]
const STREETS = ['Kerkstraat', 'Stationsstraat', 'Molenweg', 'Dorpsplein', 'Kapellelaan', 'Rue Haute', 'Avenue Louise', 'Zeedijk', 'Nieuwstraat', 'Schoolstraat']
const PLACES = [['9000', 'Gent'], ['9340', 'Lede'], ['1020', 'Brussel'], ['2000', 'Antwerpen'], ['8400', 'Oostende']]

function rows<T>(build: (i: number) => T[]): T[][] {
  return Array.from({ length: 10 }, (_, i) => build(i))
}

const CASES: Case[] = [
  {
    id: 'contrapunt',
    list: () => fromFile(CONTRAPUNT_TEST_ADRESSEN_XLSX),
    expected: { ...CONTRAPUNT_SAMPLE_COLUMN_MAPPING, country: ['Correspondentieadres - Land (Tekst)'] },
  },
  {
    id: 'aft',
    list: () => fromFile(CONTRAPUNT_AFT_200_XLS),
    expected: {
      name: ['UNSTRUCTURED_NAME'],
      streetHouseBox: ['UNSTRUCTURED_BUILDING_STREET_HOUSE_BOX'],
      postcodeCity: ['UNSTRUCTURED_POST_CODE_CITY'],
    },
  },
  {
    id: 'demo',
    list: async () => demoList(),
    expected: { ...CONTRAPUNT_SAMPLE_COLUMN_MAPPING, country: ['Correspondentieadres - Land (Tekst)'] },
  },
  {
    id: 'fr',
    list: () =>
      fromSheet('fr', [
        ['Nom', 'Prénom', 'Rue', 'Numéro', 'Boîte', 'Code postal', 'Localité', 'Courriel'],
        ...rows((i) => [PEOPLE[i][1], PEOPLE[i][0], STREETS[i], String(i + 3), i % 3 === 0 ? 'b' : '', PLACES[i % 5][0], PLACES[i % 5][1], `${PEOPLE[i][0].toLowerCase()}@example.be`]),
      ]),
    expected: { name: ['Prénom', 'Nom'], streetHouseBox: ['Rue', 'Numéro', 'Boîte'], postcodeCity: ['Code postal', 'Localité'] },
  },
  {
    id: 'en',
    list: () =>
      fromSheet('en', [
        ['Company', 'Contact', 'Address 1', 'ZIP', 'City', 'Country', 'Phone'],
        ...rows((i) => [i % 2 ? `${PEOPLE[i][1]} BV` : '', PEOPLE[i].join(' '), `${STREETS[i]} ${i + 1}`, PLACES[i % 5][0], PLACES[i % 5][1], i % 4 ? 'België' : 'Nederland', `0475 12 34 ${10 + i}`]),
      ]),
    expected: { name: ['Contact'], companyDepartment: ['Company'], streetHouseBox: ['Address 1'], postcodeCity: ['ZIP', 'City'], country: ['Country'] },
  },
  {
    id: 'odd-nl',
    list: () =>
      fromSheet('odd-nl', [
        ['Klantnr', 'Adres 1', 'Woonplaats/Gemeente', 'Postnr', 'Naam en voornaam', 'Tel'],
        ...rows((i) => [String(40100 + i), `${STREETS[i]} ${i + 2}`, PLACES[i % 5][1], PLACES[i % 5][0], `${PEOPLE[i][1]} ${PEOPLE[i][0]}`, `09 123 45 ${10 + i}`]),
      ]),
    expected: { name: ['Naam en voornaam'], streetHouseBox: ['Adres 1'], postcodeCity: ['Postnr', 'Woonplaats/Gemeente'] },
  },
  {
    id: 'generic',
    list: () =>
      fromSheet('generic', [
        ['Kolom A', 'Kolom B', 'Kolom C', 'Kolom D', 'Kolom E'],
        ...rows((i) => [PEOPLE[i].join(' '), `${STREETS[i]} ${i + 1}`, PLACES[i % 5].join(' '), `${PEOPLE[i][0].toLowerCase()}@example.be`, '']),
      ]),
    expected: { name: ['Kolom A'], streetHouseBox: ['Kolom B'], postcodeCity: ['Kolom C'] },
  },
  {
    id: 'one-column',
    list: () =>
      fromSheet('one-column', [
        ['Lid', 'Adres'],
        ...rows((i) => [String(i + 1), `${PEOPLE[i].join(' ')}, ${STREETS[i]} ${i + 1}, ${PLACES[i % 5].join(' ')}`]),
      ]),
  },
]

/** Address blocks without the empty columns: mapping an empty column changes nothing on the envelope. */
function blocks(mapping: Partial<ColumnMapping>, filled: Record<string, number>): Record<AddressField, string[]> {
  return Object.fromEntries(
    FIELDS.map((field) => [field, (mapping[field] ?? []).filter((column) => filled[column] > 0)]),
  ) as Record<AddressField, string[]>
}

/** Blocks that are expected or proposed (non-empty), and how many of those match exactly, in order. */
function score(
  actual: Partial<ColumnMapping>,
  expected: Partial<ColumnMapping>,
  filled: Record<string, number>,
): { correct: number; total: number } {
  const a = blocks(actual, filled)
  const e = blocks(expected, filled)
  const relevant = FIELDS.filter((field) => a[field].length > 0 || e[field].length > 0)
  const correct = relevant.filter((field) => JSON.stringify(a[field]) === JSON.stringify(e[field])).length
  return { correct, total: relevant.length }
}

async function main() {
  const maskName = args.get('mask') ?? 'default'
  if (!(maskName in MASKS)) throw new Error(`Onbekend masker: ${maskName}. Kies ${Object.keys(MASKS).join(', ')}.`)
  const mask = MASKS[maskName]
  const only = args.get('only')
  const verbose = args.has('verbose')
  const model = args.get('model')
  const deps = model ? { model } : {}
  const pause = Number(args.get('pause') ?? 0)

  console.log(`Masker: ${maskName} · model: ${model ?? process.env.MASSPOST_SUGGEST_MAPPING_MODEL ?? '(niet ingesteld)'}\n`)
  console.log('geval        AI   regels   ms     tokens in/uit')
  const totals = { ai: { correct: 0, total: 0 }, rules: { correct: 0, total: 0 } }

  const cases = CASES.filter((c) => !only || c.id === only)
  for (const [index, testCase] of cases.entries()) {
    if (index > 0 && pause > 0) await new Promise((resolve) => setTimeout(resolve, pause))
    const list = await testCase.list()
    const filled = columnFillCounts(list)
    const examples = columnExamples(list)
    const columns: ColumnSample[] = list.headers.map((header) => ({
      header,
      filled: filled[header],
      // The AI module masks with the default; another mask is applied first for comparison.
      examples: mask ? examples[header].map((value) => maskValue(value, mask)) : examples[header],
    }))

    let entry: SuggestMappingLogEntry | undefined
    const result = await suggestColumnRolesWithAi(
      { columns, rowCount: list.rows.length },
      { ...deps, log: (e) => (entry = e) },
    ).catch((error: Error) => error)

    const rules = suggestColumnMapping({ headers: list.headers }).mapping
    const ai = result instanceof Error ? undefined : result
    const aiScore = ai && testCase.expected ? score(ai.mapping, testCase.expected, filled) : undefined
    const rulesScore = testCase.expected ? score(rules, testCase.expected, filled) : undefined
    for (const [key, value] of [['ai', aiScore], ['rules', rulesScore]] as const) {
      if (!value) continue
      totals[key].correct += value.correct
      totals[key].total += value.total
    }
    // An AI error on a scored case counts as all expected blocks wrong.
    if (!ai && testCase.expected) totals.ai.total += rulesScore?.total ?? 0

    const cell = (n: { correct: number; total: number } | undefined) => (n ? `${n.correct}/${n.total}` : '-').padEnd(4)
    console.log(
      `${testCase.id.padEnd(12)} ${result instanceof Error ? 'fout' : cell(aiScore)} ${cell(rulesScore)}     ${String(entry?.ms ?? '-').padEnd(6)} ${entry?.inputTokens ?? '-'}/${entry?.outputTokens ?? '-'}`,
    )
    if (result instanceof Error) console.log(`             ${result.name}: ${result.message}`)
    if (verbose || !testCase.expected) {
      for (const column of columns) {
        console.log(`             ${column.header} (${column.filled}/${list.rows.length}): ${JSON.stringify(maskExamples(column.examples))}`)
      }
      if (ai) console.log(`             voorstel: ${JSON.stringify(ai)}`)
    }
  }

  console.log(
    `\nTotaal: AI ${totals.ai.correct}/${totals.ai.total} · regels ${totals.rules.correct}/${totals.rules.total}` +
      ' (adresvakken juist, in volgorde; lege kolommen tellen niet mee)',
  )
}

main().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})

// src/lib/masspost/suggest-mapping-ai.ts
import { NoObjectGeneratedError, NoOutputGeneratedError, Output, createGateway, generateText } from 'ai'
import { z } from 'zod'
import { maskExamples } from '@/core/masspost/mask'
import { env } from '@/lib/config/env'

/**
 * AI proposal for the column mapping (ADR 0006). Lives outside `src/core/masspost` because it calls a
 * model. The model sees column titles, fill counts and masked sample values — never raw cell values:
 * whatever the caller sends, the examples are masked again here.
 */

/** Thrown when no valid `provider/model` is configured. The route answers 503. */
export class SuggestMappingAiNotConfiguredError extends Error {
  readonly code = 'ai_not_configured' as const

  constructor(message = 'AI-kolommapping is niet ingesteld.') {
    super(message)
    this.name = 'SuggestMappingAiNotConfiguredError'
  }
}

/** Thrown when the model's answer is not a valid proposal. The route answers 422. */
export class SuggestMappingAiInvalidOutputError extends Error {
  readonly code = 'ai_invalid_output' as const

  constructor(message = 'Het model gaf geen geldig voorstel.') {
    super(message)
    this.name = 'SuggestMappingAiInvalidOutputError'
  }
}

/** One column as the model sees it. `examples` are masked (again) before sending. */
export interface ColumnSample {
  header: string
  /** Rows with a value in this column. */
  filled: number
  examples: readonly string[]
}

/** Input of `suggestColumnRolesWithAi`: every column of the file, in file order. */
export interface SuggestColumnRolesInput {
  columns: readonly ColumnSample[]
  rowCount: number
  localeHints?: readonly string[]
}

/** Address blocks in envelope order; within a block, the order of the list is the order on the envelope. */
export interface ColumnRolesMapping {
  name: string[]
  companyDepartment: string[]
  streetHouseBox: string[]
  postcodeCity: string[]
  country: string[]
}

/** The proposal: every column exactly once, in an address block, under `context` or under `ignore`. */
export interface ColumnRolesSuggestion {
  mapping: ColumnRolesMapping
  /** Not on the envelope, shown while correcting (member number, e-mail, phone). */
  context: string[]
  /** Empty, technical or duplicate columns. */
  ignore: string[]
}

/** What the injected or default model call receives. */
export interface SuggestMappingGenerateArgs {
  model: string
  schema: z.ZodType
  instructions: string
  prompt: string
  maxOutputTokens: number
  maxRetries: number
  /** Total time for the call, in milliseconds. */
  timeout: number
}

/** What a model call returns. `usage` feeds the log line. */
export interface SuggestMappingGenerateResult {
  output: unknown
  usage?: { inputTokens?: number; outputTokens?: number }
}

/** One log line per call. Never contains titles, examples or model output. */
export interface SuggestMappingLogEntry {
  model: string
  outcome: 'ok' | 'invalid_output' | 'timeout' | 'failed'
  ms: number
  columns: number
  inputTokens?: number
  outputTokens?: number
}

/** Dependencies, for tests and the evaluation script. */
export interface SuggestMappingAiDeps {
  /** When set (including ''), overrides `MASSPOST_SUGGEST_MAPPING_MODEL`. */
  model?: string
  generate?: (args: SuggestMappingGenerateArgs) => Promise<SuggestMappingGenerateResult>
  log?: (entry: SuggestMappingLogEntry) => void
}

const ROLES = ['name', 'companyDepartment', 'streetHouseBox', 'postcodeCity', 'country', 'context', 'ignore'] as const
const TIMEOUT_MS = 20_000
const MAX_RETRIES = 1
const MAX_OUTPUT_TOKENS = 8_000

/** Instructions for the model (Dutch). Explains the mask so the odd-looking examples make sense. */
export const SUGGEST_MAPPING_INSTRUCTIONS = `Je koppelt de kolommen van een Excel-adreslijst aan de adresvakken van bpost (e-MassPost).
Je krijgt per kolom de titel, in hoeveel rijen ze gevuld is (filled, van rowCount) en tot 5 voorbeeldwaarden.

Over de voorbeeldwaarden:
- Ze zijn gemaskeerd om de privacy te beschermen. Van elk woord is enkel de eerste letter echt; de andere letters zijn X (hoofdletter) of x (kleine letter).
- Cijfers blijven staan tot 6 per waarde; langere reeksen worden 9 (bv. een telefoonnummer).
- Volledig leesbaar zijn: postcode met gemeente in één waarde, achtervoegsels van straten (-straat, -laan, -weg, …), straattypes (rue, avenue, …), bus, rechtsvormen (BV, NV, VZW, …), tussenvoegsels (van, de, …), aansprekingen (Dhr., Mevr., …), landnamen en landcodes, en de extensie van een e-mailadres.
- De voorbeelden staan per kolom alfabetisch gesorteerd. Voorbeelden van verschillende kolommen horen dus niet bij dezelfde rij.
- Raad de echte waarden niet. Leid het doel van een kolom af uit de titel, de vorm, de lengte, de trefwoorden en hoe vaak ze gevuld is.

Rollen. Zet elke kolom in precies één rol:
- name (Comp 90): naam van de persoon. Meerdere kolommen mogen, bv. aanspreking, voornaam en familienaam.
- companyDepartment (Comp 91): bedrijf, organisatie of afdeling.
- streetHouseBox (Comp 92): straat, huisnummer en bus.
- postcodeCity (Comp 93): postcode en gemeente.
- country (Comp 17/18): het land, als naam of als code. Hoogstens één kolom.
- context: niet voor het adres, maar nuttig om een rij te herkennen bij het verbeteren, bv. een lidnummer, klantnummer, e-mail of telefoonnummer.
- ignore: leeg (filled 0), technisch (volgnummer, SEQ, PRIORITY, vlaggen) of een tweede versie van gegevens die al in een andere kolom gekoppeld zijn. Zet dezelfde gegevens nooit twee keer in het adres, bv. zowel in aparte velden (gestructureerd) als in één samengevoegd veld (ongestructureerd): kies de best gevulde versie.

Volgorde: binnen name, companyDepartment, streetHouseBox en postcodeCity is de volgorde van de lijst de volgorde op de envelop: aanspreking, voornaam, familienaam; straat, huisnummer, bus; postcode vóór gemeente. Die volgorde mag afwijken van de volgorde in het bestand.

Voorbeeld
Invoer: {"rowCount":120,"columns":[{"header":"Lidnr","filled":120,"examples":["10234","10871","11002"]},{"header":"Naam","filled":120,"examples":["Cxxxx","Pxxxxxx","Van de Vxxxx"]},{"header":"Voornaam","filled":118,"examples":["Ax","Jxx","Mxxxx"]},{"header":"Gemeente","filled":120,"examples":["Gxxx","Lxxx"]},{"header":"Postcode","filled":120,"examples":["9000","9340"]},{"header":"Adres","filled":120,"examples":["Kxxxstraat 12 bus 3","Mxxxxxxxx 5"]},{"header":"E-mail","filled":87,"examples":["ax.cxxxx@txxxxxx.be"]},{"header":"Fax","filled":0,"examples":[]}]}
Uitvoer: {"name":["Voornaam","Naam"],"companyDepartment":[],"streetHouseBox":["Adres"],"postcodeCity":["Postcode","Gemeente"],"country":[],"context":["Lidnr","E-mail"],"ignore":["Fax"]}`

const PROVIDER_MODEL = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i

/**
 * True for a gateway model id of the form `provider/model`.
 *
 * @param value Model id, e.g. from `MASSPOST_SUGGEST_MAPPING_MODEL`.
 * @returns Whether the value can be sent to the AI Gateway.
 * @example
 * isProviderModel('openai/gpt-4.1-mini') // true
 */
export function isProviderModel(value: string | undefined): value is string {
  return typeof value === 'string' && PROVIDER_MODEL.test(value.trim())
}

function resolveModel(deps: SuggestMappingAiDeps | undefined): string | undefined {
  const raw = deps && 'model' in deps ? deps.model : env.MASSPOST_SUGGEST_MAPPING_MODEL
  const trimmed = raw?.trim()
  return isProviderModel(trimmed) ? trimmed : undefined
}

/** What the model must answer: seven lists that may only name columns of the file. */
function outputSchema(headers: readonly string[]) {
  if (headers.length === 0) throw new SuggestMappingAiInvalidOutputError('Geen kolommen om te beoordelen.')
  const columns = z.array(z.enum(headers as [string, ...string[]]))
  return z.object({
    name: columns,
    companyDepartment: columns,
    streetHouseBox: columns,
    postcodeCity: columns,
    country: columns,
    context: columns,
    ignore: columns,
  })
}

function suggestionFromOutput(
  output: unknown,
  headers: readonly string[],
  schema: ReturnType<typeof outputSchema>,
): ColumnRolesSuggestion {
  const parsed = schema.safeParse(output)
  if (!parsed.success) throw new SuggestMappingAiInvalidOutputError()
  const lists = parsed.data
  const used = ROLES.flatMap((role) => lists[role])
  if (new Set(used).size !== used.length) throw new SuggestMappingAiInvalidOutputError()
  // A column the model left out is shown while correcting (web-flow decision 28).
  const missing = headers.filter((header) => !used.includes(header))
  return {
    mapping: {
      name: [...lists.name],
      companyDepartment: [...lists.companyDepartment],
      streetHouseBox: [...lists.streetHouseBox],
      postcodeCity: [...lists.postcodeCity],
      country: [...lists.country],
    },
    context: [...lists.context, ...missing],
    ignore: [...lists.ignore],
  }
}

async function generateWithGateway(args: SuggestMappingGenerateArgs): Promise<SuggestMappingGenerateResult> {
  const result = await generateText({
    model: env.AI_GATEWAY_API_KEY ? createGateway({ apiKey: env.AI_GATEWAY_API_KEY })(args.model) : args.model,
    output: Output.object({ schema: args.schema, name: 'column_roles' }),
    instructions: args.instructions,
    prompt: args.prompt,
    maxOutputTokens: args.maxOutputTokens,
    maxRetries: args.maxRetries,
    timeout: args.timeout,
  })
  return { output: result.output, usage: result.usage }
}

/** Only our own time limit aborts the call, also while the SDK waits before a retry ("Delay was aborted"). */
function isTimeout(error: unknown): boolean {
  const names = [error, (error as { cause?: unknown } | null)?.cause].map((e) => (e instanceof Error ? e.name : ''))
  return names.includes('TimeoutError') || names.includes('AbortError')
}

function logEntry(entry: SuggestMappingLogEntry): void {
  console.info(`[masspost/suggest-mapping] ${JSON.stringify(entry)}`)
}

/**
 * Asks the configured model which role each column has, and in which order the columns of one
 * address block go on the envelope. The examples are masked with `maskExamples` before sending,
 * whatever the caller passes. One log line per call, without content.
 *
 * @param input Every column of the file in file order, with fill counts and sample values.
 * @param deps Model override, model call and logger, for tests and evaluation.
 * @returns Every column exactly once: in an address block, under `context` or under `ignore`.
 * Columns the model leaves out end up under `context`.
 * @throws SuggestMappingAiNotConfiguredError when no valid model is configured.
 * @throws SuggestMappingAiInvalidOutputError when the answer is unparsable, names an unknown
 * column or uses a column twice.
 * @example
 * const { mapping, context, ignore } = await suggestColumnRolesWithAi({
 *   rowCount: 120,
 *   columns: [{ header: 'Naam', filled: 120, examples: ['Jan Peeters'] }],
 * })
 */
export async function suggestColumnRolesWithAi(
  input: SuggestColumnRolesInput,
  deps?: SuggestMappingAiDeps,
): Promise<ColumnRolesSuggestion> {
  const model = resolveModel(deps)
  if (!model) throw new SuggestMappingAiNotConfiguredError()

  const headers = input.columns.map((column) => column.header)
  const schema = outputSchema(headers)
  const prompt = JSON.stringify({
    rowCount: input.rowCount,
    ...(input.localeHints?.length ? { localeHints: input.localeHints } : {}),
    columns: input.columns.map((column) => ({
      header: column.header,
      filled: column.filled,
      examples: maskExamples(column.examples),
    })),
  })

  const generate = deps?.generate ?? generateWithGateway
  const log = deps?.log ?? logEntry
  const started = Date.now()
  const done = (outcome: SuggestMappingLogEntry['outcome'], usage?: SuggestMappingGenerateResult['usage']) =>
    log({
      model,
      outcome,
      ms: Date.now() - started,
      columns: headers.length,
      inputTokens: usage?.inputTokens,
      outputTokens: usage?.outputTokens,
    })

  let result: SuggestMappingGenerateResult
  try {
    result = await generate({
      model,
      schema,
      instructions: SUGGEST_MAPPING_INSTRUCTIONS,
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      maxRetries: MAX_RETRIES,
      timeout: TIMEOUT_MS,
    })
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error) || NoOutputGeneratedError.isInstance(error)) {
      done('invalid_output', NoObjectGeneratedError.isInstance(error) ? error.usage : undefined)
      throw new SuggestMappingAiInvalidOutputError()
    }
    done(isTimeout(error) ? 'timeout' : 'failed')
    throw error
  }

  try {
    const suggestion = suggestionFromOutput(result.output, headers, schema)
    done('ok', result.usage)
    return suggestion
  } catch (error) {
    done('invalid_output', result.usage)
    throw error
  }
}

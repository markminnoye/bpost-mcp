// src/core/masspost/suggest-mapping.ts
import type { AddressField, ColumnMapping, UnstructuredTarget } from './mapping'
import { AFT_COLUMNS, AFT_MARKER_COLUMNS, AFT_PRESET_ID } from './presets/aft'

/**
 * Suggests a ColumnMapping from Excel headers. Pure: no Next.js, no AI, no cell values.
 * The caller confirms the suggestion. This function does not read or write pipeline input.
 */

export type MappingConfidence = 'high' | 'medium' | 'low'
export type MappingPresetId = typeof AFT_PRESET_ID
export type MappingLocale = 'nl' | 'fr' | 'en'

export interface SuggestColumnMappingInput {
  headers: readonly string[]
  localeHints?: readonly string[]
}

export interface SuggestColumnMappingResult {
  mapping: ColumnMapping
  confidence: MappingConfidence
  /** Why each Comp target (90, 91, 92, 93, and 18 for the country) was chosen. */
  rationale: Record<string, string>
  unmatchedHeaders: string[]
  needsAi: boolean
  /** Set when the titles match a known layout: bpost's Address File Tool. */
  preset?: MappingPresetId
}

type Role =
  | 'givenName'
  | 'familyName'
  | 'fullName'
  | 'company'
  | 'street'
  | 'houseNumber'
  | 'box'
  | 'postcode'
  | 'city'
  | 'countryName'
  | 'countryCode'

const ROLE_TARGET: Record<Role, AddressField> = {
  givenName: 'name',
  familyName: 'name',
  fullName: 'name',
  company: 'companyDepartment',
  street: 'streetHouseBox',
  houseNumber: 'streetHouseBox',
  box: 'streetHouseBox',
  postcode: 'postcodeCity',
  city: 'postcodeCity',
  countryName: 'country',
  countryCode: 'country',
}

const TARGET_ROLES: Record<AddressField, readonly Role[]> = {
  name: ['givenName', 'fullName', 'familyName'],
  companyDepartment: ['company'],
  streetHouseBox: ['street', 'houseNumber', 'box'],
  postcodeCity: ['postcode', 'city'],
  // One country column at most: the name when there is one, else the two-letter code.
  country: ['countryName', 'countryCode'],
}

const REQUIRED_TARGETS: readonly UnstructuredTarget[] = ['name', 'streetHouseBox', 'postcodeCity']

const ASSIGN_THRESHOLD = 60
const HIGH_THRESHOLD = 80
const AMBIGUITY_MARGIN = 10
const LOCALE_BOOST = 3

interface Synonym {
  phrase: string
  role: Role
  locale: MappingLocale
}

/** Phrases are already normalized (lowercase, no accents). */
const SYNONYMS: readonly Synonym[] = [
  { phrase: 'roepnaam', role: 'givenName', locale: 'nl' },
  { phrase: 'voornaam', role: 'givenName', locale: 'nl' },
  { phrase: 'first name', role: 'givenName', locale: 'en' },
  { phrase: 'firstname', role: 'givenName', locale: 'en' },
  { phrase: 'given name', role: 'givenName', locale: 'en' },
  { phrase: 'prenom', role: 'givenName', locale: 'fr' },
  { phrase: 'familienaam', role: 'familyName', locale: 'nl' },
  { phrase: 'achternaam', role: 'familyName', locale: 'nl' },
  { phrase: 'last name', role: 'familyName', locale: 'en' },
  { phrase: 'lastname', role: 'familyName', locale: 'en' },
  { phrase: 'surname', role: 'familyName', locale: 'en' },
  { phrase: 'family name', role: 'familyName', locale: 'en' },
  { phrase: 'nom de famille', role: 'familyName', locale: 'fr' },
  { phrase: 'nom', role: 'familyName', locale: 'fr' },
  { phrase: 'naam', role: 'fullName', locale: 'nl' },
  { phrase: 'volledige naam', role: 'fullName', locale: 'nl' },
  { phrase: 'name', role: 'fullName', locale: 'en' },
  { phrase: 'full name', role: 'fullName', locale: 'en' },
  { phrase: 'bedrijf', role: 'company', locale: 'nl' },
  { phrase: 'firma', role: 'company', locale: 'nl' },
  { phrase: 'afdeling', role: 'company', locale: 'nl' },
  { phrase: 'company', role: 'company', locale: 'en' },
  { phrase: 'department', role: 'company', locale: 'en' },
  { phrase: 'organisation', role: 'company', locale: 'en' },
  { phrase: 'organization', role: 'company', locale: 'en' },
  { phrase: 'societe', role: 'company', locale: 'fr' },
  { phrase: 'departement', role: 'company', locale: 'fr' },
  { phrase: 'straat', role: 'street', locale: 'nl' },
  { phrase: 'straatnaam', role: 'street', locale: 'nl' },
  { phrase: 'street', role: 'street', locale: 'en' },
  { phrase: 'address line', role: 'street', locale: 'en' },
  { phrase: 'rue', role: 'street', locale: 'fr' },
  { phrase: 'adres', role: 'street', locale: 'nl' },
  { phrase: 'address', role: 'street', locale: 'en' },
  { phrase: 'adresse', role: 'street', locale: 'fr' },
  { phrase: 'huisnummer', role: 'houseNumber', locale: 'nl' },
  { phrase: 'huisnr', role: 'houseNumber', locale: 'nl' },
  { phrase: 'huis nummer', role: 'houseNumber', locale: 'nl' },
  { phrase: 'nummer', role: 'houseNumber', locale: 'nl' },
  { phrase: 'house number', role: 'houseNumber', locale: 'en' },
  { phrase: 'housenumber', role: 'houseNumber', locale: 'en' },
  { phrase: 'number', role: 'houseNumber', locale: 'en' },
  { phrase: 'numero', role: 'houseNumber', locale: 'fr' },
  { phrase: 'aanv huisnr', role: 'box', locale: 'nl' },
  { phrase: 'aanvullend huisnummer', role: 'box', locale: 'nl' },
  { phrase: 'busnummer', role: 'box', locale: 'nl' },
  { phrase: 'bus', role: 'box', locale: 'nl' },
  { phrase: 'box', role: 'box', locale: 'en' },
  { phrase: 'boite', role: 'box', locale: 'fr' },
  { phrase: 'appartement', role: 'box', locale: 'nl' },
  { phrase: 'apartment', role: 'box', locale: 'en' },
  { phrase: 'postcode', role: 'postcode', locale: 'nl' },
  { phrase: 'post code', role: 'postcode', locale: 'nl' },
  { phrase: 'postal code', role: 'postcode', locale: 'en' },
  { phrase: 'zip code', role: 'postcode', locale: 'en' },
  { phrase: 'zipcode', role: 'postcode', locale: 'en' },
  { phrase: 'zip', role: 'postcode', locale: 'en' },
  { phrase: 'code postal', role: 'postcode', locale: 'fr' },
  { phrase: 'plaats', role: 'city', locale: 'nl' },
  { phrase: 'stad', role: 'city', locale: 'nl' },
  { phrase: 'gemeente', role: 'city', locale: 'nl' },
  { phrase: 'woonplaats', role: 'city', locale: 'nl' },
  { phrase: 'city', role: 'city', locale: 'en' },
  { phrase: 'town', role: 'city', locale: 'en' },
  { phrase: 'locality', role: 'city', locale: 'en' },
  { phrase: 'ville', role: 'city', locale: 'fr' },
  { phrase: 'localite', role: 'city', locale: 'fr' },
  { phrase: 'land', role: 'countryName', locale: 'nl' },
  { phrase: 'landnaam', role: 'countryName', locale: 'nl' },
  { phrase: 'pays', role: 'countryName', locale: 'fr' },
  { phrase: 'country', role: 'countryName', locale: 'en' },
  { phrase: 'country name', role: 'countryName', locale: 'en' },
  { phrase: 'countryname', role: 'countryName', locale: 'en' },
  { phrase: 'landcode', role: 'countryCode', locale: 'nl' },
  { phrase: 'code pays', role: 'countryCode', locale: 'fr' },
  { phrase: 'country code', role: 'countryCode', locale: 'en' },
  { phrase: 'countrycode', role: 'countryCode', locale: 'en' },
  { phrase: 'iso country code', role: 'countryCode', locale: 'en' },
  { phrase: 'countryisocode', role: 'countryCode', locale: 'en' },
]

interface PreparedHeader {
  raw: string
  norm: string
  index: number
}

interface Assignment {
  raw: string
  index: number
  role: Role
  target: AddressField
  score: number
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/ +/g, ' ')
}

function prepareHeaders(headers: readonly string[]): { unique: PreparedHeader[]; duplicates: string[] } {
  const seen = new Set<string>()
  const unique: PreparedHeader[] = []
  const duplicates: string[] = []
  headers.forEach((header, index) => {
    const raw = header.trim()
    const norm = normalize(raw)
    if (!norm) return
    if (seen.has(norm)) {
      duplicates.push(raw)
      return
    }
    seen.add(norm)
    unique.push({ raw, norm, index })
  })
  return { unique, duplicates }
}

function knownLocales(localeHints: readonly string[] | undefined): Set<MappingLocale> {
  const locales = new Set<MappingLocale>()
  for (const hint of localeHints ?? []) {
    if (hint === 'nl' || hint === 'fr' || hint === 'en') locales.add(hint)
  }
  return locales
}

function containsTokenSequence(haystack: string[], needle: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let matches = true
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        matches = false
        break
      }
    }
    if (matches) return true
  }
  return false
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost)
      previous = current
    }
  }
  return row[b.length]
}

function scorePhrase(headerNorm: string, phrase: string): number {
  if (headerNorm === phrase) return 100
  if (phrase.length <= 2) return 0
  const headerTokens = headerNorm.split(' ')
  const phraseTokens = phrase.split(' ')
  if (containsTokenSequence(headerTokens, phraseTokens)) {
    return Math.min(95, 80 + phrase.length)
  }
  if (headerTokens.length === 1 && phraseTokens.length === 1 && phrase.length >= 5) {
    const distance = levenshtein(headerNorm, phrase)
    if (distance === 1) return 60
  }
  return 0
}

function listColumns(columns: readonly string[]): string {
  return columns.join(', ')
}

/** First AFT title (in either spelling) that is in the file, per block. */
function aftColumn(present: ReadonlySet<string>, field: AddressField): string | undefined {
  return AFT_COLUMNS[field].find((column) => present.has(column))
}

function matchesAft(headers: readonly PreparedHeader[]): boolean {
  const present = new Set(headers.map((header) => header.raw))
  return (
    AFT_MARKER_COLUMNS.every((column) => present.has(column)) &&
    REQUIRED_TARGETS.every((target) => aftColumn(present, target) !== undefined)
  )
}

function aftResult(headers: readonly PreparedHeader[], duplicates: readonly string[]): SuggestColumnMappingResult {
  const present = new Set(headers.map((header) => header.raw))
  const pick = (field: AddressField) => {
    const column = aftColumn(present, field)
    return column ? [column] : []
  }
  const companyDepartment = pick('companyDepartment')
  const country = pick('country')
  const mapping: ColumnMapping = {
    name: pick('name'),
    streetHouseBox: pick('streetHouseBox'),
    postcodeCity: pick('postcodeCity'),
    ...(companyDepartment.length ? { companyDepartment } : {}),
    ...(country.length ? { country } : {}),
  }
  const used = new Set(Object.values(mapping).flat())
  return {
    mapping,
    confidence: 'high',
    rationale: {
      '90': `Address File Tool: ${mapping.name.join(', ')}.`,
      '91': companyDepartment.length ? `Address File Tool: ${companyDepartment.join(', ')}.` : 'Geen kolom voor bedrijf of afdeling.',
      '92': `Address File Tool: ${mapping.streetHouseBox.join(', ')}.`,
      '93': `Address File Tool: ${mapping.postcodeCity.join(', ')}.`,
      '18': country.length ? `Address File Tool: ${country.join(', ')}.` : 'Geen kolom voor het land.',
    },
    unmatchedHeaders: [
      ...headers.filter((header) => !used.has(header.raw)).map((header) => header.raw),
      ...duplicates,
    ],
    needsAi: false,
    preset: AFT_PRESET_ID,
  }
}

interface RankedHit {
  role: Role
  target: AddressField
  base: number
  rank: number
}

function bestHits(headerNorm: string, locales: Set<MappingLocale>): { best?: RankedHit; alternate?: RankedHit } {
  let best: RankedHit | undefined
  let alternate: RankedHit | undefined

  for (const synonym of SYNONYMS) {
    const base = scorePhrase(headerNorm, synonym.phrase)
    if (base === 0) continue
    const rank = base + (locales.has(synonym.locale) ? LOCALE_BOOST : 0)
    const hit: RankedHit = { role: synonym.role, target: ROLE_TARGET[synonym.role], base, rank }
    if (!best || hit.rank > best.rank) {
      if (best && best.target !== hit.target && (!alternate || best.rank > alternate.rank)) {
        alternate = best
      }
      best = hit
      continue
    }
    if (best.target !== hit.target && (!alternate || hit.rank > alternate.rank)) {
      alternate = hit
    }
  }

  return { best, alternate }
}

function isAmbiguous(best: RankedHit, alternate: RankedHit | undefined): boolean {
  if (!alternate) return false
  if (alternate.target === best.target) return false
  if (alternate.base < ASSIGN_THRESHOLD) return false
  return best.rank - alternate.rank <= AMBIGUITY_MARGIN
}

function assignHeaders(headers: readonly PreparedHeader[], locales: Set<MappingLocale>): {
  assignments: Assignment[]
  unmatched: string[]
  hadAmbiguity: boolean
} {
  const assignments: Assignment[] = []
  const unmatched: string[] = []
  let hadAmbiguity = false

  for (const header of headers) {
    const { best, alternate } = bestHits(header.norm, locales)
    if (!best || best.base < ASSIGN_THRESHOLD || isAmbiguous(best, alternate)) {
      if (best && alternate && isAmbiguous(best, alternate)) hadAmbiguity = true
      unmatched.push(header.raw)
      continue
    }
    assignments.push({
      raw: header.raw,
      index: header.index,
      role: best.role,
      target: best.target,
      score: best.base,
    })
  }

  return { assignments, unmatched, hadAmbiguity }
}

function columnsFor(assignments: readonly Assignment[], target: AddressField): string[] {
  const columns: string[] = []
  for (const role of TARGET_ROLES[target]) {
    const matches = assignments
      .filter((assignment) => assignment.role === role)
      .sort((a, b) => a.index - b.index)
    for (const match of matches) columns.push(match.raw)
  }
  // Joining two country columns ("België BE") makes no sense: keep the first, by role priority.
  return target === 'country' ? columns.slice(0, 1) : columns
}

function rationaleFor(target: AddressField, columns: readonly string[], assignments: readonly Assignment[]): string {
  if (target === 'country') return columns.length ? `${listColumns(columns)} als land.` : 'Geen kolom voor het land.'
  if (columns.length === 0) {
    if (target === 'name') return 'Geen kolom voor naam.'
    if (target === 'companyDepartment') return 'Geen kolom voor bedrijf of afdeling.'
    if (target === 'streetHouseBox') return 'Geen kolom voor straat, huisnummer en bus.'
    return 'Geen kolom voor postcode en plaats.'
  }
  const fuzzy = assignments.some((assignment) => assignment.target === target && assignment.score < HIGH_THRESHOLD)
  const listed = listColumns(columns)
  if (target === 'name') return fuzzy ? `${listed} lijkt op de naam.` : `${listed} als naam.`
  if (target === 'companyDepartment') {
    return fuzzy ? `${listed} lijkt op bedrijf of afdeling.` : `${listed} als bedrijf of afdeling.`
  }
  if (target === 'streetHouseBox') {
    return fuzzy ? `${listed} lijkt op straat, huisnummer of bus.` : `${listed} als straat, huisnummer en bus.`
  }
  return fuzzy ? `${listed} lijkt op postcode of plaats.` : `${listed} als postcode en plaats.`
}

function heuristicResult(
  headers: readonly PreparedHeader[],
  duplicates: readonly string[],
  locales: Set<MappingLocale>,
): SuggestColumnMappingResult {
  const { assignments, unmatched, hadAmbiguity } = assignHeaders(headers, locales)
  const name = columnsFor(assignments, 'name')
  const companyDepartment = columnsFor(assignments, 'companyDepartment')
  const streetHouseBox = columnsFor(assignments, 'streetHouseBox')
  const postcodeCity = columnsFor(assignments, 'postcodeCity')
  const country = columnsFor(assignments, 'country')

  const mapping: ColumnMapping = {
    name,
    streetHouseBox,
    postcodeCity,
    ...(companyDepartment.length > 0 ? { companyDepartment } : {}),
    ...(country.length > 0 ? { country } : {}),
  }
  // Columns that lost the country slot to a better one are not used.
  const used = new Set([...name, ...companyDepartment, ...streetHouseBox, ...postcodeCity, ...country])
  const unused = assignments.filter((assignment) => !used.has(assignment.raw)).map((assignment) => assignment.raw)

  const requiredFilled = REQUIRED_TARGETS.every((target) => columnsFor(assignments, target).length > 0)
  const weakest = assignments.reduce((min, assignment) => Math.min(min, assignment.score), 100)
  let confidence: MappingConfidence
  if (!requiredFilled) confidence = 'low'
  else if (!hadAmbiguity && weakest >= HIGH_THRESHOLD) confidence = 'high'
  else confidence = 'medium'

  return {
    mapping,
    confidence,
    rationale: {
      '90': rationaleFor('name', name, assignments),
      '91': rationaleFor('companyDepartment', companyDepartment, assignments),
      '92': rationaleFor('streetHouseBox', streetHouseBox, assignments),
      '93': rationaleFor('postcodeCity', postcodeCity, assignments),
      '18': rationaleFor('country', country, assignments),
    },
    unmatchedHeaders: [...unmatched, ...unused, ...duplicates],
    needsAi: !requiredFilled || confidence === 'low',
  }
}

/**
 * Suggests which columns feed each address block, from the column titles only. A known layout
 * (bpost's Address File Tool) is recognised exactly and reported in `preset`; other files go
 * through NL/FR/EN synonyms with a little tolerance for typos.
 *
 * @param input Column titles and optional language hints.
 * @returns The mapping, how sure it is, why, the unused titles, and whether AI could help.
 * @example
 * const { mapping, preset } = suggestColumnMapping({ headers: parsed.headers })
 */
export function suggestColumnMapping(input: SuggestColumnMappingInput): SuggestColumnMappingResult {
  const { unique, duplicates } = prepareHeaders(input.headers)
  const locales = knownLocales(input.localeHints)
  // The AFT layout is recognised from its titles; there is nothing to suggest then.
  if (matchesAft(unique)) {
    return aftResult(unique, duplicates)
  }
  return heuristicResult(unique, duplicates, locales)
}

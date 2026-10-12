# SR-112 v1: app-shell en mailingflow — implementatieplan

## Status: uitgevoerd (12/10/2026), wacht op review van Mark. Overdracht: [2026-10-12-sr-112-v1-overdracht.md](2026-10-12-sr-112-v1-overdracht.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eén werkende webapp: zijbalk-shell, mailinglijst, Archief, Deposits, Instellingen, een nieuwe stap 1 en de POC-flow als echte flow per mailing, bewaard in de browser (IndexedDB).

**Architecture:** Eerst de library `src/core/masspost/store/` (Zod-schema van `mailing.json`, `MailingStore` met een geheugen- en een IndexedDB-uitvoering, sortering en codes), daarna dunne pagina's in `src/app/(app)/` die componenten uit `src/components/app-shell/`, `src/components/mailings/` en `src/components/mailing-flow/` gebruiken. De POC-code verhuist en wordt hernoemd, niet herschreven. De server blijft voor login en tenantinstellingen; adressen komen nooit op de server.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zod 4, CSS modules + CSS-variabelen, Geist, `@tabler/icons-react`, SheetJS, NextAuth 5 + Drizzle (Neon), Vitest 4, `fake-indexeddb` (nieuw, dev).

**Spec:** [`2026-10-12-sr-112-v1-design.md`](2026-10-12-sr-112-v1-design.md), met als bron [`2026-10-11-sr-112-webapp-shell-design.md`](2026-10-11-sr-112-webapp-shell-design.md) ("het SR-112-plan") en de schets [`docs/ontwerp/webapp/app-shell.html`](../../docs/ontwerp/webapp/app-shell.html). Lees alle drie voor je begint.

## Global Constraints

- Library eerst, interface daarna (AGENTS.md). Geen UI-taak start voor taak 1–3 groen zijn.
- Geen adressen in de database, de logs of de server. Adressen bestaan enkel in de browser (IndexedDB).
- Alle omgevingsvariabelen via `src/lib/config/env.ts`; geen hardgecodeerde `.vercel.app`-URL's.
- TSDoc (JSDoc-stijl, `@param`, `@returns`, `@example` waar nuttig) op alle geëxporteerde functies en publieke types.
- Klantgerichte tekst in het Vlaams, zonder jargon: laad `.agent/prompts/customer-facing-agent.md` vóór taak 6.
- Stijl van de POC: CSS-variabelen en CSS modules, Geist, **licht als standaard**, zwarte hoofdknoppen. Geen Tailwind, geen shadcn.
- Iconen uit `@tabler/icons-react` (de schets gebruikt dezelfde Tabler-paden), `size={16}` of `{18}`, `stroke={1.75}`, `aria-hidden="true"`.
- Plaatshouders: gedempt, label "binnenkort", `aria-disabled="true"`, hovertip, niet klikbaar, wel focusbaar.
- Foutmelding IndexedDB: exact "Je browser bewaart hier niets, mogelijk omdat dit een privévenster is. Open de app in een venster zonder privémodus."
- Hoofdmap/database-naam: `bpost-e-masspost`.
- Code van een mailing: letters, cijfers en koppeltekens, maximaal 20 tekens; vorm `<voorvoegsel>-<jaar>-<n>`.
- Presortering verplicht en vast aan bij klein formaat vanaf **25.000** adressen; ronde en sequentie enkel bij groot formaat, standaard aan vanaf **10.000**.
- Grenzen van de POC blijven: minder dan 500 adressen waarschuwing, meer dan 25.000 waarschuwing, meer dan 150.000 stop.
- Commits: Mark wil **geen tussentijdse commits** (één commit op het einde van de batch). De stappen "Commit" hieronder zijn dus **checkpoints**: draai de tests, commit niet, tenzij Mark het anders zegt.
- DoD per taak: `npx vitest run <tests van de taak>` groen. DoD op het einde: `npm run lint:fix`, `npx tsc --noEmit`, `npm test`, `npm run docs:check`.

## Review Focus

1. **Hervatten na herladen in elke stap** (stap 2 zonder koppeling, stap 3 met halve correcties, stap 4): de gebruiker verwacht exact terug te komen waar hij was. Test in taak 10 (`resumeStep`).
2. **Twee tabbladen op dezelfde mailing:** het tweede tabblad mag het werk van het eerste niet stil overschrijven. Test in taak 2 (contract: `RevisionConflictError`) en in taak 10 (`useMailingSaver` toont de balk).
3. **Een code die al bestaat** (ook een gearchiveerde): "Verder" mag geen tweede mailing met dezelfde code maken. Test in taak 2 (contract: `CodeTakenError`, ook gearchiveerd) en taak 9.
4. **Een kapotte of onbekende mailing in IndexedDB** (oude `schemaVersion`, ontbrekend veld): de lijst moet blijven werken. Test in taak 3 (`list()` geeft `{ ok: false }` voor die ene).
5. **IndexedDB niet beschikbaar of vol:** geen witte pagina, wel de melding en "Opnieuw proberen". Test in taak 3 (`StoreUnavailableError`) en taak 7/10 (meldingen).

---

## Bestandsstructuur

| Pad | Verantwoordelijkheid |
|---|---|
| `src/core/masspost/store/mailing.ts` | Zod-schema `mailing.json`, statussen en groepen, samenvatting, sortering, codes, regels voor presortering en ronde/sequentie, `missingDetails` |
| `src/core/masspost/store/mailing-store.ts` | Interface `MailingStore`, fouttypes, `applyChange` (gedeeld door de stores) |
| `src/core/masspost/store/memory-store.ts` | `MemoryMailingStore` |
| `src/core/masspost/store/indexeddb-store.ts` | `IndexedDbMailingStore` |
| `src/core/masspost/store/hash.ts` | `sha256Hex` |
| `src/core/masspost/store/index.ts` | barrel van de store |
| `tests/core/masspost/store/*.test.ts` + `mailing-store-contract.ts` | tests; het contract draait op beide stores |
| `src/lib/db/schema.ts` + `drizzle/0005_*.sql` | 5 kolommen in `tenant_preferences` |
| `src/lib/tenant/settings.ts` | tenantinstellingen lezen (server) |
| `src/lib/tenant/settings-schema.ts` | Zod-schema's van de formulieren van Instellingen |
| `src/components/app-shell/` | `tokens.css`, `AppShell`, `Sidebar`, `UserMenu`, `Placeholder`, `useStoredPreference`, `shell.module.css` |
| `src/components/mailings/` | `MailingStoreProvider`, `MailingList`, `MailingRow`, `RowMenu`, `StatusIcon`, `list.module.css` |
| `src/components/mailing-flow/` | ex-POC: `MailingFlow`, `ImportStep`, `MappingStep`, `FormatStep`, `IssueRow`, `MetaPills`, `StepBar`, `StatusIcons`, `columns.ts`, `ai-suggestion.ts`, `save-file.ts`, `resume.ts`, `useMailingSaver.ts`, `mailing-flow.module.css` |
| `src/app/page.tsx` | home: aanmelden of door naar `/mailings` |
| `src/app/(app)/layout.tsx` | login-check, tenant, shell |
| `src/app/(app)/mailings/page.tsx`, `nieuw/page.tsx`, `[code]/page.tsx`, `archief/page.tsx`, `deposits/page.tsx`, `instellingen/page.tsx` + `instellingen/actions.ts` | dunne pagina's |

---

### Task 1: `mailing.ts` — schema, sortering, codes en regels

**Files:**
- Create: `src/core/masspost/store/mailing.ts`
- Test: `tests/core/masspost/store/mailing.test.ts`

**Interfaces:**
- Produces: `mailingSchema`, `type Mailing`, `type MailingDetails`, `MAILING_STATUSES`, `type MailingStatus`, `STATUS_GROUP`, `type MailingSummary`, `summarize(m)`, `type MailingSort`, `sortMailings(items, sort)`, `MAILING_CODE_PATTERN`, `isValidMailingCode(code)`, `defaultCodePrefix(tenantName)`, `nextMailingCode(prefix, year, existing)`, `PRESORT_REQUIRED_FROM`, `ROUND_SEQUENCE_DEFAULT_FROM`, `presortLocked(format, n)`, `roundSequenceAllowed(format)`, `defaultRoundSequence(format, n)`, `type MissingDetail`, `missingDetails(draft, today)`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/core/masspost/store/mailing.test.ts
import { describe, it, expect } from 'vitest'
import {
  mailingSchema,
  summarize,
  sortMailings,
  isValidMailingCode,
  defaultCodePrefix,
  nextMailingCode,
  presortLocked,
  roundSequenceAllowed,
  defaultRoundSequence,
  missingDetails,
  type Mailing,
  type MailingSummary,
} from '@/core/masspost/store/mailing'

export function sampleMailing(over: Partial<Mailing> = {}): Mailing {
  return {
    schemaVersion: 1,
    id: 'm1',
    revision: 1,
    code: 'CP-2026-15',
    title: 'Nieuwsbrief december',
    customer: { name: 'Kunstencentrum Noord', crmId: null },
    expectedDeliveryDate: '2026-10-24',
    format: 'Small',
    priority: 'NP',
    genMID: '7',
    genPSC: 'N',
    roundAndSequence: false,
    status: 'uploaded',
    archived: false,
    source: { name: 'adressen.xlsx', size: 1234, sha256: 'ab'.repeat(32) },
    mapping: null,
    corrections: {},
    excludedRows: [],
    counts: { addresses: 1246, formatIssuesOpen: null },
    arr: null,
    log: [{ at: '2026-10-12T10:00:00.000Z', by: 'an@contrapunt.be', event: 'created' }],
    created: { at: '2026-10-12T10:00:00.000Z', by: 'an@contrapunt.be' },
    modified: { at: '2026-10-12T10:00:00.000Z', by: 'an@contrapunt.be' },
    ...over,
  }
}

function row(over: Partial<MailingSummary>): MailingSummary {
  return { ...summarize(sampleMailing()), ...over }
}

describe('mailingSchema', () => {
  it('accepts a complete mailing', () => {
    expect(mailingSchema.safeParse(sampleMailing()).success).toBe(true)
  })
  it('rejects an unknown schema version and a bad code', () => {
    expect(mailingSchema.safeParse({ ...sampleMailing(), schemaVersion: 2 }).success).toBe(false)
    expect(mailingSchema.safeParse(sampleMailing({ code: 'CP 2026/15' })).success).toBe(false)
  })
})

describe('sortMailings', () => {
  const a = row({ id: 'a', status: 'format', expectedDeliveryDate: '2026-11-01', code: 'CP-2026-3', title: 'b' })
  const b = row({ id: 'b', status: 'mapped', expectedDeliveryDate: '2026-10-20', code: 'CP-2026-12', title: 'a' })
  const c = row({ id: 'c', status: 'uploaded', expectedDeliveryDate: '2026-10-25', code: 'CP-2026-2', title: 'c' })
  const d = row({ id: 'd', status: 'done', expectedDeliveryDate: '2026-10-01', code: 'CP-2025-40', title: 'd' })
  const e = row({ id: 'e', status: 'submitted', expectedDeliveryDate: '2026-10-30', code: 'CP-2026-1', title: 'e' })

  it('status: action first, then waiting, then done; submitted before done; earliest date first', () => {
    expect(sortMailings([d, e, b, a, c], 'status').map((m) => m.id)).toEqual(['c', 'a', 'b', 'e', 'd'])
  })
  it('code: newest first, numerically', () => {
    expect(sortMailings([a, b, c, d], 'code').map((m) => m.id)).toEqual(['b', 'a', 'c', 'd'])
  })
  it('title: A–Z; date: earliest first; modified: most recent first', () => {
    expect(sortMailings([a, b, c], 'title').map((m) => m.id)).toEqual(['b', 'a', 'c'])
    expect(sortMailings([a, b, c], 'date').map((m) => m.id)).toEqual(['b', 'c', 'a'])
    const old = row({ id: 'old', modifiedAt: '2026-10-01T00:00:00.000Z' })
    const recent = row({ id: 'new', modifiedAt: '2026-10-12T00:00:00.000Z' })
    expect(sortMailings([old, recent], 'modified').map((m) => m.id)).toEqual(['new', 'old'])
  })
  it('does not change the input array', () => {
    const input = [a, b]
    sortMailings(input, 'title')
    expect(input.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('codes', () => {
  it('validates letters, digits and hyphens up to 20 characters', () => {
    expect(isValidMailingCode('CP-2026-15')).toBe(true)
    expect(isValidMailingCode('')).toBe(false)
    expect(isValidMailingCode('a'.repeat(21))).toBe(false)
    expect(isValidMailingCode('CP_2026')).toBe(false)
  })
  it('derives a prefix from the tenant name', () => {
    expect(defaultCodePrefix('Contrapunt')).toBe('CO')
    expect(defaultCodePrefix('Sonic Rocket')).toBe('SR')
    expect(defaultCodePrefix('  ')).toBe('M')
  })
  it('proposes the highest number of this year plus one', () => {
    expect(nextMailingCode('CP', 2026, [])).toBe('CP-2026-1')
    expect(nextMailingCode('CP', 2026, ['CP-2026-9', 'CP-2026-14', 'CP-2025-99', 'X-2026-50'])).toBe('CP-2026-15')
    expect(nextMailingCode('cp', 2026, ['CP-2026-3'])).toBe('CP-2026-4')
  })
})

describe('rules', () => {
  it('locks presort for small format from 25,000 addresses', () => {
    expect(presortLocked('Small', 24_999)).toBe(false)
    expect(presortLocked('Small', 25_000)).toBe(true)
    expect(presortLocked('Large', 30_000)).toBe(false)
  })
  it('allows round and sequence only for large format, on by default from 10,000', () => {
    expect(roundSequenceAllowed('Small')).toBe(false)
    expect(roundSequenceAllowed('Large')).toBe(true)
    expect(defaultRoundSequence('Large', 9_999)).toBe(false)
    expect(defaultRoundSequence('Large', 10_000)).toBe(true)
    expect(defaultRoundSequence('Small', 50_000)).toBe(false)
  })
  it('lists what is still missing, in form order', () => {
    expect(missingDetails({ title: '', code: 'CP-2026-1', expectedDeliveryDate: '', hasFile: false }, '2026-10-12')).toEqual([
      'title',
      'date',
      'file',
    ])
    expect(missingDetails({ title: 'x', code: 'bad code', expectedDeliveryDate: '2026-10-11', hasFile: true }, '2026-10-12')).toEqual([
      'code',
      'date',
    ])
    expect(missingDetails({ title: 'x', code: 'CP-2026-1', expectedDeliveryDate: '2026-10-12', hasFile: true }, '2026-10-12')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/masspost/store/mailing.test.ts`
Expected: FAIL — `Failed to resolve import "@/core/masspost/store/mailing"`.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/masspost/store/mailing.ts
import { z } from 'zod'

/** Version of `mailing.json`. A mailing with another version is shown as unreadable. */
export const MAILING_SCHEMA_VERSION = 1

/**
 * Statuses of a mailing, from `docs/ontwerp/webapp/statusiconen.html`. v1 reaches only
 * `uploaded`, `mapped` and `format`; the list can show all of them.
 */
export const MAILING_STATUSES = ['uploaded', 'mapped', 'format', 'checked', 'submitted', 'overdue', 'done', 'withdrawn'] as const
/** One status of a mailing. */
export type MailingStatus = (typeof MAILING_STATUSES)[number]

/** Group of a status: 0 needs action, 1 waiting, 2 done (SR-112 decision 9). */
export const STATUS_GROUP: Record<MailingStatus, 0 | 1 | 2> = {
  uploaded: 0,
  mapped: 1,
  format: 0,
  checked: 0,
  submitted: 2,
  overdue: 0,
  done: 2,
  withdrawn: 0,
}

/** Letters, digits and hyphens, at most 20 characters. The code is also the `mailingRef` to bpost. */
export const MAILING_CODE_PATTERN = /^[A-Za-z0-9-]{1,20}$/

const stamp = z.object({ at: z.string().datetime(), by: z.string().min(1) })

/** Zod schema of `mailing.json` (SR-112 plan §1). `id` is the store id (later the Drive folder id). */
export const mailingSchema = z.object({
  schemaVersion: z.literal(MAILING_SCHEMA_VERSION),
  id: z.string().min(1),
  revision: z.number().int().nonnegative(),
  code: z.string().regex(MAILING_CODE_PATTERN),
  title: z.string().trim().min(1).max(200),
  customer: z.object({ name: z.string().max(200), crmId: z.string().nullable() }),
  expectedDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['Small', 'Large']),
  priority: z.enum(['NP', 'P']),
  genMID: z.enum(['N', '7', '9', '11']),
  genPSC: z.enum(['Y', 'N']),
  roundAndSequence: z.boolean(),
  status: z.enum(MAILING_STATUSES),
  archived: z.boolean(),
  source: z.object({ name: z.string().min(1), size: z.number().int().nonnegative(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }),
  mapping: z.object({ order: z.array(z.string()), roles: z.record(z.string(), z.string()) }).nullable(),
  /** Corrected values, keyed `<seq>:<field>` as in the format step. */
  corrections: z.record(z.string(), z.string()),
  /** Excluded rows, by `seq` (the Excel row number). */
  excludedRows: z.array(z.number().int()),
  counts: z.object({ addresses: z.number().int().nonnegative(), formatIssuesOpen: z.number().int().nonnegative().nullable() }),
  arr: z.number().min(0).max(100).nullable(),
  log: z.array(z.object({ at: z.string().datetime(), by: z.string(), event: z.string() })),
  created: stamp,
  modified: stamp,
})

/** A mailing as stored in `mailing.json`. */
export type Mailing = z.infer<typeof mailingSchema>

/** What the user fills in at step 1. */
export type MailingDetails = Pick<
  Mailing,
  'code' | 'title' | 'customer' | 'expectedDeliveryDate' | 'format' | 'priority' | 'genMID' | 'genPSC' | 'roundAndSequence'
>

/** One row in the list. Later the same fields go into Drive `appProperties`. */
export interface MailingSummary {
  id: string
  code: string
  title: string
  status: MailingStatus
  archived: boolean
  customer: string
  addresses: number
  formatIssuesOpen: number | null
  arr: number | null
  expectedDeliveryDate: string
  modifiedAt: string
}

/**
 * The fields of a mailing the list needs.
 * @param m The mailing.
 * @returns Its summary.
 */
export function summarize(m: Mailing): MailingSummary {
  return {
    id: m.id,
    code: m.code,
    title: m.title,
    status: m.status,
    archived: m.archived,
    customer: m.customer.name,
    addresses: m.counts.addresses,
    formatIssuesOpen: m.counts.formatIssuesOpen,
    arr: m.arr,
    expectedDeliveryDate: m.expectedDeliveryDate,
    modifiedAt: m.modified.at,
  }
}

/** Sort orders of the list (SR-112 decision 24). */
export type MailingSort = 'status' | 'date' | 'modified' | 'code' | 'title'

const byDate = (a: MailingSummary, b: MailingSummary) =>
  (a.expectedDeliveryDate || '9999').localeCompare(b.expectedDeliveryDate || '9999')

/** Year and number of a code like `CP-2026-15`, for "newest first". */
function codeKey(code: string): [number, number] {
  const m = /-(\d{4})-(\d+)$/.exec(code)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

/**
 * Sorts the list. `status`: action needed, then waiting, then done (submitted before done), then the
 * earliest delivery date. `date`: earliest first. `modified`: most recent first. `code`: newest first.
 * `title`: A–Z. Returns a new array.
 * @param items The rows.
 * @param sort The order.
 * @returns The sorted rows.
 * @example sortMailings(rows, 'status')
 */
export function sortMailings(items: readonly MailingSummary[], sort: MailingSort): MailingSummary[] {
  const out = [...items]
  const collator = new Intl.Collator('nl', { sensitivity: 'base', numeric: true })
  switch (sort) {
    case 'status':
      return out.sort(
        (a, b) =>
          STATUS_GROUP[a.status] - STATUS_GROUP[b.status] ||
          Number(a.status === 'done') - Number(b.status === 'done') ||
          byDate(a, b),
      )
    case 'date':
      return out.sort(byDate)
    case 'modified':
      return out.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    case 'code':
      return out.sort((a, b) => {
        const [ya, na] = codeKey(a.code)
        const [yb, nb] = codeKey(b.code)
        return yb - ya || nb - na || collator.compare(b.code, a.code)
      })
    case 'title':
      return out.sort((a, b) => collator.compare(a.title, b.title))
  }
}

/**
 * Checks a mailing code: letters, digits and hyphens, 1 to 20 characters.
 * @param code The code.
 * @returns True when valid.
 */
export function isValidMailingCode(code: string): boolean {
  return MAILING_CODE_PATTERN.test(code)
}

/**
 * Prefix for codes when the tenant has none set: the first letters of the first two words, or the
 * first two letters of a single word, in capitals.
 * @param tenantName The tenant name.
 * @returns The prefix, `M` when the name has no letters.
 * @example defaultCodePrefix('Sonic Rocket') // 'SR'
 */
export function defaultCodePrefix(tenantName: string): string {
  const words = tenantName.normalize('NFD').replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'M'
  const prefix = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]
  return prefix.toUpperCase()
}

/**
 * The next code: prefix, year and the highest number of that year plus one (SR-112 decision 17).
 * @param prefix The tenant prefix (case-insensitive; the result is in capitals).
 * @param year The year.
 * @param existing All codes in the store, archived ones included.
 * @returns A code like `CP-2026-15`.
 * @example nextMailingCode('CP', 2026, ['CP-2026-14']) // 'CP-2026-15'
 */
export function nextMailingCode(prefix: string, year: number, existing: readonly string[]): string {
  const p = prefix.toUpperCase()
  const pattern = new RegExp(`^${p.replace(/[-]/g, '\\-')}-${year}-(\\d+)$`, 'i')
  const highest = existing.reduce((max, code) => {
    const m = pattern.exec(code)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `${p}-${year}-${highest + 1}`
}

/** From this many addresses, presort is required for small format (meeting 06/10, SR-86). */
export const PRESORT_REQUIRED_FROM = 25_000
/** From this many addresses, round and sequence is on by default for large format (SR-112 decision 25). */
export const ROUND_SEQUENCE_DEFAULT_FROM = 10_000

/**
 * Presort is required and cannot be switched off.
 * @param format Small or Large.
 * @param addresses Number of addresses in the file.
 * @returns True when locked on.
 */
export function presortLocked(format: Mailing['format'], addresses: number): boolean {
  return format === 'Small' && addresses >= PRESORT_REQUIRED_FROM
}

/**
 * Round and sequence exists only for large format.
 * @param format Small or Large.
 * @returns True when the choice is available.
 */
export function roundSequenceAllowed(format: Mailing['format']): boolean {
  return format === 'Large'
}

/**
 * Default of round and sequence, until the user chooses.
 * @param format Small or Large.
 * @param addresses Number of addresses in the file.
 * @returns True when on by default.
 */
export function defaultRoundSequence(format: Mailing['format'], addresses: number): boolean {
  return roundSequenceAllowed(format) && addresses >= ROUND_SEQUENCE_DEFAULT_FROM
}

/** Something still needed before "Verder naar koppelen". */
export type MissingDetail = 'title' | 'code' | 'date' | 'file'

/**
 * What is still missing at step 1, in form order. Format and priority always have a value.
 * @param draft The fields that can be empty or wrong, and whether a file was read without error.
 * @param today Today as `YYYY-MM-DD`; the delivery date may not be earlier.
 * @returns The missing items; empty when "Verder" may be enabled.
 */
export function missingDetails(
  draft: { title: string; code: string; expectedDeliveryDate: string; hasFile: boolean },
  today: string,
): MissingDetail[] {
  const missing: MissingDetail[] = []
  if (!draft.title.trim()) missing.push('title')
  if (!isValidMailingCode(draft.code)) missing.push('code')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.expectedDeliveryDate) || draft.expectedDeliveryDate < today) missing.push('date')
  if (!draft.hasFile) missing.push('file')
  return missing
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/masspost/store/mailing.test.ts`
Expected: PASS (alle tests).

- [ ] **Step 5: Checkpoint** — tests groen; niet committen (zie Global Constraints).

---

### Task 2: `MailingStore`, `applyChange` en `MemoryMailingStore`, met een contracttest

**Files:**
- Create: `src/core/masspost/store/mailing-store.ts`, `src/core/masspost/store/memory-store.ts`, `src/core/masspost/store/hash.ts`
- Create: `tests/core/masspost/store/mailing-store-contract.ts` (geen `.test.ts`: wordt geïmporteerd)
- Test: `tests/core/masspost/store/memory-store.test.ts`

**Interfaces:**
- Consumes: `Mailing`, `MailingDetails`, `MailingSummary`, `mailingSchema`, `summarize` (taak 1).
- Produces:
  - `interface NewMailing { details: MailingDetails; source: Mailing['source']; addresses: number }`
  - `type MailingChange = Partial<Pick<Mailing, 'title'|'customer'|'expectedDeliveryDate'|'format'|'priority'|'genMID'|'genPSC'|'roundAndSequence'|'status'|'mapping'|'corrections'|'excludedRows'|'counts'|'arr'>>`
  - `type MailingListItem = { ok: true; summary: MailingSummary } | { ok: false; id: string }`
  - `interface MailingStore { list(): Promise<MailingListItem[]>; get(id: string): Promise<Mailing | null>; findByCode(code: string): Promise<Mailing | null>; create(input: NewMailing, file: Blob, by: string): Promise<Mailing>; update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing>; archive(id: string, by: string): Promise<Mailing>; restore(id: string, by: string): Promise<Mailing>; getSourceFile(id: string): Promise<Blob | null> }`
  - `class RevisionConflictError extends Error { current: Mailing }`, `class CodeTakenError extends Error { code: string }`, `class MailingNotFoundError`, `class UnreadableMailingError { id: string }`, `class StoreUnavailableError`
  - `applyChange(m, change, by, event, now): Mailing`, `newMailing(id, input, by, now): Mailing`
  - `new MemoryMailingStore(options?: { now?: () => Date; newId?: () => string })`
  - `sha256Hex(bytes: ArrayBuffer): Promise<string>`
  - `describeMailingStore(name, make: () => MailingStore)` (testhulp)

- [ ] **Step 1: Write the contract and the failing test**

```ts
// tests/core/masspost/store/mailing-store-contract.ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  type MailingStore,
  type NewMailing,
} from '@/core/masspost/store/mailing-store'

export function newInput(code = 'CP-2026-1'): NewMailing {
  return {
    details: {
      code,
      title: 'Nieuwsbrief',
      customer: { name: 'Klant', crmId: null },
      expectedDeliveryDate: '2026-10-24',
      format: 'Small',
      priority: 'NP',
      genMID: '7',
      genPSC: 'N',
      roundAndSequence: false,
    },
    source: { name: 'adressen.xlsx', size: 3, sha256: 'ab'.repeat(32) },
    addresses: 1246,
  }
}

const file = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'application/vnd.ms-excel' })

/** Behaviour every MailingStore must have. */
export function describeMailingStore(name: string, make: () => MailingStore | Promise<MailingStore>) {
  describe(`${name} (contract)`, () => {
    let store: MailingStore
    beforeEach(async () => {
      store = await make()
    })

    it('creates a mailing with status uploaded, revision 1 and a log entry', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      expect(m).toMatchObject({ code: 'CP-2026-1', status: 'uploaded', revision: 1, archived: false })
      expect(m.counts).toEqual({ addresses: 1246, formatIssuesOpen: null })
      expect(m.log.map((l) => l.event)).toEqual(['created'])
      expect(await store.get(m.id)).toEqual(m)
      expect(await store.findByCode('cp-2026-1')).toEqual(m)
    })

    it('keeps the source file', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const blob = await store.getSourceFile(m.id)
      expect(blob).not.toBeNull()
      expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    })

    it('refuses a code that exists, also when archived, case-insensitive', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      await store.archive(m.id, 'an@x.be')
      await expect(store.create(newInput('cp-2026-1'), file(), 'an@x.be')).rejects.toBeInstanceOf(CodeTakenError)
    })

    it('updates with the right revision and refuses an old one', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      const m2 = await store.update(m.id, { status: 'mapped', mapping: { order: ['A'], roles: { A: 'name' } } }, 1, 'bo@x.be', 'mapped')
      expect(m2).toMatchObject({ revision: 2, status: 'mapped', modified: { by: 'bo@x.be' } })
      expect(m2.log.at(-1)?.event).toBe('mapped')
      const err = await store.update(m.id, { title: 'Oud' }, 1, 'an@x.be', 'edited').catch((e) => e)
      expect(err).toBeInstanceOf(RevisionConflictError)
      expect((err as RevisionConflictError).current.revision).toBe(2)
      expect((await store.get(m.id))?.title).toBe('Nieuwsbrief')
    })

    it('archives and restores; the list shows both, with archived flag', async () => {
      const m = await store.create(newInput(), file(), 'an@x.be')
      await store.create(newInput('CP-2026-2'), file(), 'an@x.be')
      await store.archive(m.id, 'an@x.be')
      let items = await store.list()
      expect(items).toHaveLength(2)
      expect(items.find((i) => i.ok && i.summary.id === m.id)).toMatchObject({ ok: true, summary: { archived: true } })
      await store.restore(m.id, 'an@x.be')
      items = await store.list()
      expect(items.every((i) => i.ok && !i.summary.archived)).toBe(true)
    })

    it('throws MailingNotFoundError for an unknown id', async () => {
      expect(await store.get('nope')).toBeNull()
      await expect(store.update('nope', {}, 1, 'a', 'x')).rejects.toBeInstanceOf(MailingNotFoundError)
    })
  })
}
```

```ts
// tests/core/masspost/store/memory-store.test.ts
import { describe, it, expect } from 'vitest'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import { sha256Hex } from '@/core/masspost/store/hash'
import { describeMailingStore } from './mailing-store-contract'

describeMailingStore('MemoryMailingStore', () => new MemoryMailingStore())

describe('sha256Hex', () => {
  it('hashes bytes as lowercase hex', async () => {
    const bytes = new TextEncoder().encode('abc').buffer as ArrayBuffer
    expect(await sha256Hex(bytes)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/masspost/store/memory-store.test.ts`
Expected: FAIL — imports kunnen niet opgelost worden.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/masspost/store/hash.ts
/**
 * SHA-256 of a file, as lowercase hex. Uses Web Crypto (browser and Node 20+).
 * @param bytes The file contents.
 * @returns 64 hex characters.
 */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
```

```ts
// src/core/masspost/store/mailing-store.ts
import { MAILING_SCHEMA_VERSION, type Mailing, type MailingDetails, type MailingSummary } from './mailing'

/** Input to create a mailing (step 1, "Verder naar koppelen"). */
export interface NewMailing {
  details: MailingDetails
  source: Mailing['source']
  addresses: number
}

/** Fields that can change after creation. The code is fixed once created. */
export type MailingChange = Partial<
  Pick<
    Mailing,
    | 'title' | 'customer' | 'expectedDeliveryDate' | 'format' | 'priority' | 'genMID' | 'genPSC' | 'roundAndSequence'
    | 'status' | 'mapping' | 'corrections' | 'excludedRows' | 'counts' | 'arr'
  >
>

/** A row of the list, or a mailing that cannot be read (shown as "Kan deze mailing niet lezen"). */
export type MailingListItem = { ok: true; summary: MailingSummary } | { ok: false; id: string }

/**
 * Where mailings live. v1: IndexedDB in the browser; later Google Drive (ADR 0007), behind the same
 * interface. Every write raises `revision`; `update` with an older revision is refused.
 */
export interface MailingStore {
  /** All mailings, archived ones included, unsorted. */
  list(): Promise<MailingListItem[]>
  /** One mailing, or null when unknown. Throws `UnreadableMailingError` when it fails the schema. */
  get(id: string): Promise<Mailing | null>
  /** The mailing with this code (case-insensitive), or null. */
  findByCode(code: string): Promise<Mailing | null>
  /** Creates the mailing with its Excel file. Throws `CodeTakenError` when the code exists. */
  create(input: NewMailing, file: Blob, by: string): Promise<Mailing>
  /** Applies a change. Throws `RevisionConflictError` when `expectedRevision` is not the current one. */
  update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing>
  /** Moves the mailing to the archive. */
  archive(id: string, by: string): Promise<Mailing>
  /** Takes the mailing out of the archive. */
  restore(id: string, by: string): Promise<Mailing>
  /** The Excel file of the mailing, or null. */
  getSourceFile(id: string): Promise<Blob | null>
}

/** Someone else saved the mailing in the meantime. `current` is the stored version. */
export class RevisionConflictError extends Error {
  constructor(public readonly current: Mailing) {
    super(`Mailing ${current.code} changed in the meantime (revision ${current.revision}).`)
    this.name = 'RevisionConflictError'
  }
}

/** A mailing with this code exists already (archived ones included). */
export class CodeTakenError extends Error {
  constructor(public readonly code: string) {
    super(`Code ${code} exists already.`)
    this.name = 'CodeTakenError'
  }
}

/** No mailing with this id. */
export class MailingNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Mailing ${id} not found.`)
    this.name = 'MailingNotFoundError'
  }
}

/** The stored data fails the schema (unknown version or broken). */
export class UnreadableMailingError extends Error {
  constructor(public readonly id: string) {
    super(`Mailing ${id} cannot be read.`)
    this.name = 'UnreadableMailingError'
  }
}

/** The storage of the browser is not available (private window, blocked, full). */
export class StoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Mailing storage is not available.', { cause })
    this.name = 'StoreUnavailableError'
  }
}

/**
 * A new mailing as stored: status `uploaded`, revision 1, one log entry.
 * @param id Store id.
 * @param input Details, source and number of addresses.
 * @param by E-mail of the user.
 * @param now The time.
 * @returns The mailing.
 */
export function newMailing(id: string, input: NewMailing, by: string, now: Date): Mailing {
  const at = now.toISOString()
  return {
    schemaVersion: MAILING_SCHEMA_VERSION,
    id,
    revision: 1,
    ...input.details,
    status: 'uploaded',
    archived: false,
    source: input.source,
    mapping: null,
    corrections: {},
    excludedRows: [],
    counts: { addresses: input.addresses, formatIssuesOpen: null },
    arr: null,
    log: [{ at, by, event: 'created' }],
    created: { at, by },
    modified: { at, by },
  }
}

/**
 * Applies a change: raises the revision, sets `modified` and adds a log entry. Does not check the
 * revision; the store does that.
 * @param m The current mailing.
 * @param change The fields to change.
 * @param by E-mail of the user.
 * @param event Log event, e.g. `mapped`.
 * @param now The time.
 * @returns The new mailing.
 */
export function applyChange(m: Mailing, change: MailingChange & { archived?: boolean }, by: string, event: string, now: Date): Mailing {
  const at = now.toISOString()
  return { ...m, ...change, revision: m.revision + 1, modified: { at, by }, log: [...m.log, { at, by, event }] }
}
```

```ts
// src/core/masspost/store/memory-store.ts
import { mailingSchema, summarize, type Mailing } from './mailing'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  applyChange,
  newMailing,
  type MailingChange,
  type MailingListItem,
  type MailingStore,
  type NewMailing,
} from './mailing-store'

/** A `MailingStore` in memory, for tests and examples. Lost when the page reloads. */
export class MemoryMailingStore implements MailingStore {
  private readonly mailings = new Map<string, Mailing>()
  private readonly files = new Map<string, Blob>()
  private readonly now: () => Date
  private readonly newId: () => string

  /**
   * @param options `now` and `newId` can be replaced in tests.
   */
  constructor(options: { now?: () => Date; newId?: () => string } = {}) {
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  async list(): Promise<MailingListItem[]> {
    return [...this.mailings.values()].map((m) => ({ ok: true as const, summary: summarize(m) }))
  }

  async get(id: string): Promise<Mailing | null> {
    return this.mailings.get(id) ?? null
  }

  async findByCode(code: string): Promise<Mailing | null> {
    const c = code.toLowerCase()
    return [...this.mailings.values()].find((m) => m.code.toLowerCase() === c) ?? null
  }

  async create(input: NewMailing, file: Blob, by: string): Promise<Mailing> {
    if (await this.findByCode(input.details.code)) throw new CodeTakenError(input.details.code)
    const m = mailingSchema.parse(newMailing(this.newId(), input, by, this.now()))
    this.mailings.set(m.id, m)
    this.files.set(m.id, file)
    return m
  }

  async update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing> {
    return this.write(id, change, by, event, expectedRevision)
  }

  async archive(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: true }, by, 'archived')
  }

  async restore(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: false }, by, 'restored')
  }

  async getSourceFile(id: string): Promise<Blob | null> {
    return this.files.get(id) ?? null
  }

  private write(id: string, change: MailingChange & { archived?: boolean }, by: string, event: string, expectedRevision?: number): Mailing {
    const current = this.mailings.get(id)
    if (!current) throw new MailingNotFoundError(id)
    if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new RevisionConflictError(current)
    const next = mailingSchema.parse(applyChange(current, change, by, event, this.now()))
    this.mailings.set(id, next)
    return next
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/masspost/store/`
Expected: PASS.

- [ ] **Step 5: Checkpoint** — niet committen.

---

### Task 3: `IndexedDbMailingStore`, barrel en TSDoc-publicatie

**Files:**
- Create: `src/core/masspost/store/indexeddb-store.ts`, `src/core/masspost/store/index.ts`
- Modify: `src/core/masspost/index.ts` (export `./store`, en de kopcommentaar: "the web app" i.p.v. de POC)
- Modify: `package.json` (devDependency `fake-indexeddb`)
- Test: `tests/core/masspost/store/indexeddb-store.test.ts`

**Interfaces:**
- Consumes: alles uit taak 2.
- Produces: `new IndexedDbMailingStore(options?: { indexedDB?: IDBFactory; name?: string; now?: () => Date; newId?: () => string })`. Database `bpost-e-masspost`, versie 1, stores `mailings` (keyPath `id`) en `files` (key = id, waarde `{ bytes: ArrayBuffer, type: string }`).

- [ ] **Step 1: Install the test dependency**

Run: `npm install --save-dev fake-indexeddb@6`
Expected: `package.json` krijgt `"fake-indexeddb": "^6…"` onder `devDependencies`.

- [ ] **Step 2: Write the failing test**

```ts
// tests/core/masspost/store/indexeddb-store.test.ts
import { describe, it, expect } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { IndexedDbMailingStore } from '@/core/masspost/store/indexeddb-store'
import { RevisionConflictError, StoreUnavailableError } from '@/core/masspost/store/mailing-store'
import { describeMailingStore, newInput } from './mailing-store-contract'

describeMailingStore('IndexedDbMailingStore', () => new IndexedDbMailingStore({ indexedDB: new IDBFactory() }))

const file = () => new Blob([new Uint8Array([9])])

describe('IndexedDbMailingStore', () => {
  it('shows a broken mailing as unreadable, and the others normally', async () => {
    const factory = new IDBFactory()
    const store = new IndexedDbMailingStore({ indexedDB: factory })
    const good = await store.create(newInput(), file(), 'a@x.be')
    // Write a broken record next to it, as an older app version could have.
    await new Promise<void>((resolve, reject) => {
      const open = factory.open('bpost-e-masspost', 1)
      open.onsuccess = () => {
        const tx = open.result.transaction('mailings', 'readwrite')
        tx.objectStore('mailings').put({ id: 'broken', schemaVersion: 99 })
        tx.oncomplete = () => {
          open.result.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
    const items = await store.list()
    expect(items).toContainEqual({ ok: false, id: 'broken' })
    expect(items).toContainEqual(expect.objectContaining({ ok: true, summary: expect.objectContaining({ id: good.id }) }))
  })

  it('a second store on the same database sees the change and refuses its old revision', async () => {
    const factory = new IDBFactory()
    const tabA = new IndexedDbMailingStore({ indexedDB: factory })
    const tabB = new IndexedDbMailingStore({ indexedDB: factory })
    const m = await tabA.create(newInput(), file(), 'a@x.be')
    await tabA.update(m.id, { title: 'A' }, 1, 'a@x.be', 'edited')
    await expect(tabB.update(m.id, { title: 'B' }, 1, 'b@x.be', 'edited')).rejects.toBeInstanceOf(RevisionConflictError)
  })

  it('throws StoreUnavailableError when IndexedDB is missing', async () => {
    const store = new IndexedDbMailingStore({ indexedDB: undefined as unknown as IDBFactory })
    await expect(store.list()).rejects.toBeInstanceOf(StoreUnavailableError)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/core/masspost/store/indexeddb-store.test.ts`
Expected: FAIL — module `indexeddb-store` ontbreekt.

- [ ] **Step 4: Write the implementation**

```ts
// src/core/masspost/store/indexeddb-store.ts
import { mailingSchema, summarize, type Mailing } from './mailing'
import {
  CodeTakenError,
  MailingNotFoundError,
  RevisionConflictError,
  StoreUnavailableError,
  UnreadableMailingError,
  applyChange,
  newMailing,
  type MailingChange,
  type MailingListItem,
  type MailingStore,
  type NewMailing,
} from './mailing-store'

const VERSION = 1
interface StoredFile {
  bytes: ArrayBuffer
  type: string
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

/**
 * `MailingStore` in the browser's IndexedDB (v1, SR-112 v1 decision 2). Stays on this device only.
 * A write reads, checks the revision and writes in one transaction, so two tabs cannot overwrite
 * each other.
 */
export class IndexedDbMailingStore implements MailingStore {
  private db?: Promise<IDBDatabase>
  private readonly factory?: IDBFactory
  private readonly name: string
  private readonly now: () => Date
  private readonly newId: () => string

  /**
   * @param options `indexedDB` (default `globalThis.indexedDB`), database `name` (default
   * `bpost-e-masspost`), and `now`/`newId` for tests.
   */
  constructor(options: { indexedDB?: IDBFactory; name?: string; now?: () => Date; newId?: () => string } = {}) {
    this.factory = 'indexedDB' in options ? options.indexedDB : globalThis.indexedDB
    this.name = options.name ?? 'bpost-e-masspost'
    this.now = options.now ?? (() => new Date())
    this.newId = options.newId ?? (() => crypto.randomUUID())
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) return reject(new StoreUnavailableError())
      let request: IDBOpenDBRequest
      try {
        request = this.factory.open(this.name, VERSION)
      } catch (e) {
        return reject(new StoreUnavailableError(e))
      }
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('mailings')) db.createObjectStore('mailings', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(new StoreUnavailableError(request.error))
      request.onblocked = () => reject(new StoreUnavailableError(new Error('blocked')))
    }).catch((e) => {
      this.db = undefined
      throw e instanceof StoreUnavailableError ? e : new StoreUnavailableError(e)
    })
    return this.db
  }

  private parse(raw: unknown): Mailing {
    const parsed = mailingSchema.safeParse(raw)
    if (!parsed.success) throw new UnreadableMailingError(String((raw as { id?: unknown })?.id ?? '?'))
    return parsed.data
  }

  async list(): Promise<MailingListItem[]> {
    const db = await this.open()
    const all = await done(db.transaction('mailings').objectStore('mailings').getAll())
    return all.map((raw) => {
      const parsed = mailingSchema.safeParse(raw)
      return parsed.success
        ? { ok: true as const, summary: summarize(parsed.data) }
        : { ok: false as const, id: String((raw as { id?: unknown })?.id ?? '?') }
    })
  }

  async get(id: string): Promise<Mailing | null> {
    const db = await this.open()
    const raw = await done(db.transaction('mailings').objectStore('mailings').get(id))
    return raw === undefined ? null : this.parse(raw)
  }

  async findByCode(code: string): Promise<Mailing | null> {
    const db = await this.open()
    const all = await done(db.transaction('mailings').objectStore('mailings').getAll())
    const c = code.toLowerCase()
    const raw = all.find((r) => typeof r?.code === 'string' && r.code.toLowerCase() === c)
    return raw === undefined ? null : this.parse(raw)
  }

  async create(input: NewMailing, file: Blob, by: string): Promise<Mailing> {
    const db = await this.open()
    const m = mailingSchema.parse(newMailing(this.newId(), input, by, this.now()))
    const stored: StoredFile = { bytes: await file.arrayBuffer(), type: file.type }
    const tx = db.transaction(['mailings', 'files'], 'readwrite')
    const mailings = tx.objectStore('mailings')
    const ended = finished(tx)
    const c = input.details.code.toLowerCase()
    const all = mailings.getAll()
    let taken = false
    all.onsuccess = () => {
      taken = all.result.some((r) => typeof r?.code === 'string' && r.code.toLowerCase() === c)
      if (taken) return tx.abort()
      mailings.put(m)
      tx.objectStore('files').put(stored, m.id)
    }
    try {
      await ended
    } catch (e) {
      if (taken) throw new CodeTakenError(input.details.code)
      throw new StoreUnavailableError(e)
    }
    return m
  }

  update(id: string, change: MailingChange, expectedRevision: number, by: string, event: string): Promise<Mailing> {
    return this.write(id, change, by, event, expectedRevision)
  }

  archive(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: true }, by, 'archived')
  }

  restore(id: string, by: string): Promise<Mailing> {
    return this.write(id, { archived: false }, by, 'restored')
  }

  async getSourceFile(id: string): Promise<Blob | null> {
    const db = await this.open()
    const stored = (await done(db.transaction('files').objectStore('files').get(id))) as StoredFile | undefined
    return stored ? new Blob([stored.bytes], { type: stored.type }) : null
  }

  private async write(
    id: string,
    change: MailingChange & { archived?: boolean },
    by: string,
    event: string,
    expectedRevision?: number,
  ): Promise<Mailing> {
    const db = await this.open()
    const tx = db.transaction('mailings', 'readwrite')
    const store = tx.objectStore('mailings')
    const ended = finished(tx)
    let failure: Error | undefined
    let result: Mailing | undefined
    const read = store.get(id)
    read.onsuccess = () => {
      try {
        if (read.result === undefined) throw new MailingNotFoundError(id)
        const current = this.parse(read.result)
        if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new RevisionConflictError(current)
        result = mailingSchema.parse(applyChange(current, change, by, event, this.now()))
        store.put(result)
      } catch (e) {
        failure = e as Error
        tx.abort()
      }
    }
    try {
      await ended
    } catch (e) {
      throw failure ?? new StoreUnavailableError(e)
    }
    return result!
  }
}
```

```ts
// src/core/masspost/store/index.ts
export * from './mailing'
export * from './mailing-store'
export * from './memory-store'
export * from './indexeddb-store'
export * from './hash'
```

In `src/core/masspost/index.ts`: voeg `export * from './store'` toe en vervang in de kopcommentaar `the web POC (src/app/(tools)/masspost/poc)` door `the web app (src/components/mailing-flow, src/components/mailings)`.

- [ ] **Step 5: Run tests and docs**

Run: `npx vitest run tests/core/masspost/store/ && npm run docs:build`
Expected: PASS; `docs/ontwikkelaars/library/` bevat de nieuwe store-exports (TypeDoc zonder waarschuwingen over ontbrekende TSDoc).

- [ ] **Step 6: Checkpoint** — niet committen.

---

### Task 4: Tenantinstellingen — migratie, lezen en formulierschema's

**Files:**
- Modify: `src/lib/db/schema.ts:26-35` (`tenantPreferences`)
- Create: `drizzle/0005_*.sql` (via `npm run db:generate`)
- Create: `src/lib/tenant/settings.ts`, `src/lib/tenant/settings-schema.ts`
- Test: `tests/lib/tenant/settings-schema.test.ts`

**Interfaces:**
- Consumes: `defaultCodePrefix` (taak 1).
- Produces:
  - `interface TenantDefaults { format: 'Small'|'Large'; priority: 'NP'|'P'; genMID: 'N'|'7'|'9'|'11'; genPSC: 'Y'|'N'; codePrefix: string }`
  - `interface TenantSettings { tenantId: string; name: string; defaults: TenantDefaults; bpost: { username: string; customerNumber: string; accountId: string; barcodeCustomerId: string | null; hasPassword: boolean } | null }`
  - `getTenantSettings(tenantId: string): Promise<TenantSettings | null>` (server)
  - `organisationSchema`, `defaultsSchema`, `bpostCredentialsSchema` (Zod, `z.object` over `Object.fromEntries(formData)`)

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/tenant/settings-schema.test.ts
import { describe, it, expect } from 'vitest'
import { bpostCredentialsSchema, defaultsSchema, organisationSchema } from '@/lib/tenant/settings-schema'

describe('organisationSchema', () => {
  it('trims the name and refuses an empty one', () => {
    expect(organisationSchema.parse({ name: '  Contrapunt ' })).toEqual({ name: 'Contrapunt' })
    expect(organisationSchema.safeParse({ name: '  ' }).success).toBe(false)
  })
})

describe('defaultsSchema', () => {
  it('accepts the form values and an empty prefix', () => {
    expect(defaultsSchema.parse({ format: 'Large', priority: 'P', genMID: 'N', genPSC: 'Y', codePrefix: '' })).toEqual({
      format: 'Large',
      priority: 'P',
      genMID: 'N',
      genPSC: 'Y',
      codePrefix: '',
    })
  })
  it('treats a missing presort checkbox as N and uppercases the prefix', () => {
    expect(defaultsSchema.parse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'cp' })).toMatchObject({ genPSC: 'N', codePrefix: 'CP' })
  })
  it('refuses a prefix with spaces or longer than 8, and an unknown barcode', () => {
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'C P' }).success).toBe(false)
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'ABCDEFGHI' }).success).toBe(false)
    expect(defaultsSchema.safeParse({ format: 'Small', priority: 'NP', genMID: '12', codePrefix: '' }).success).toBe(false)
  })
})

describe('bpostCredentialsSchema', () => {
  it('allows an empty password (keep the stored one) and an empty barcode customer id', () => {
    expect(
      bpostCredentialsSchema.parse({ username: 'u', password: '', customerNumber: '12345', accountId: '67890', barcodeCustomerId: '' }),
    ).toEqual({ username: 'u', password: '', customerNumber: '12345', accountId: '67890', barcodeCustomerId: null })
  })
  it('refuses a barcode customer id that is not 5 digits', () => {
    expect(
      bpostCredentialsSchema.safeParse({ username: 'u', password: '', customerNumber: '1', accountId: '2', barcodeCustomerId: '123' }).success,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/tenant/settings-schema.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Write the schemas**

```ts
// src/lib/tenant/settings-schema.ts
import { z } from 'zod'

/** Form "Organisatie" in Instellingen. */
export const organisationSchema = z.object({ name: z.string().trim().min(1).max(100) })

/** Form "Standaardwaarden" in Instellingen. A missing checkbox means "N". */
export const defaultsSchema = z.object({
  format: z.enum(['Small', 'Large']),
  priority: z.enum(['NP', 'P']),
  genMID: z.enum(['N', '7', '9', '11']),
  genPSC: z.enum(['Y', 'N']).default('N'),
  codePrefix: z
    .string()
    .trim()
    .max(8)
    .regex(/^[A-Za-z0-9]*$/)
    .transform((s) => s.toUpperCase()),
})

/** Form "bpost" in Instellingen. An empty password keeps the stored one. */
export const bpostCredentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string(),
  customerNumber: z.string().trim().min(1),
  accountId: z.string().trim().min(1),
  barcodeCustomerId: z
    .string()
    .trim()
    .transform((s) => (s === '' ? null : s))
    .pipe(z.string().regex(/^\d{5}$/).nullable()),
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/tenant/settings-schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Extend the DB schema and generate the migration**

In `src/lib/db/schema.ts`, `tenantPreferences`, na `barcodeLength`:

```ts
  /** Defaults for a new mailing (Instellingen → Standaardwaarden, SR-112). */
  defaultFormat: text('default_format').notNull().default('Small'),
  defaultPriority: text('default_priority').notNull().default('NP'),
  defaultGenMid: text('default_gen_mid').notNull().default('7'),
  defaultPresort: text('default_presort').notNull().default('N'),
  /** Prefix of mailing codes; null means the initials of the tenant name. */
  codePrefix: text('code_prefix'),
```

Run: `npm run db:generate`
Expected: een nieuw bestand `drizzle/0005_<naam>.sql` met vijf `ALTER TABLE "tenant_preferences" ADD COLUMN …`. Lees het na: enkel `ADD COLUMN`, geen `DROP`.

**Toepassen op de database (`npm run db:push`) gebeurt niet zonder Marks akkoord** in de chat: het raakt de gedeelde Neon-database.

- [ ] **Step 6: Write `getTenantSettings`**

```ts
// src/lib/tenant/settings.ts
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bpostCredentials, tenantPreferences, tenants } from '@/lib/db/schema'
import { defaultCodePrefix } from '@/core/masspost/store/mailing'

/** Defaults for a new mailing. */
export interface TenantDefaults {
  format: 'Small' | 'Large'
  priority: 'NP' | 'P'
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  /** Never empty: falls back to the initials of the tenant name. */
  codePrefix: string
}

/** What Instellingen and step 1 need. The bpost password never leaves the server. */
export interface TenantSettings {
  tenantId: string
  name: string
  defaults: TenantDefaults
  /** The stored prefix, empty when none is set (the form shows the fallback as placeholder). */
  storedCodePrefix: string
  bpost: { username: string; customerNumber: string; accountId: string; barcodeCustomerId: string | null; hasPassword: boolean } | null
}

const pick = <T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/**
 * Reads the settings of a tenant.
 * @param tenantId The tenant.
 * @returns The settings, or null when the tenant does not exist.
 */
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)
  if (!tenant) return null
  const [prefs] = await db.select().from(tenantPreferences).where(eq(tenantPreferences.tenantId, tenantId)).limit(1)
  const [creds] = await db.select().from(bpostCredentials).where(eq(bpostCredentials.tenantId, tenantId)).limit(1)
  const stored = prefs?.codePrefix?.trim() ?? ''
  return {
    tenantId,
    name: tenant.name,
    storedCodePrefix: stored,
    defaults: {
      format: pick(prefs?.defaultFormat, ['Small', 'Large'] as const, 'Small'),
      priority: pick(prefs?.defaultPriority, ['NP', 'P'] as const, 'NP'),
      genMID: pick(prefs?.defaultGenMid, ['N', '7', '9', '11'] as const, '7'),
      genPSC: pick(prefs?.defaultPresort, ['Y', 'N'] as const, 'N'),
      codePrefix: stored || defaultCodePrefix(tenant.name),
    },
    bpost: creds
      ? {
          username: creds.username,
          customerNumber: creds.customerNumber,
          accountId: creds.accountId,
          barcodeCustomerId: creds.barcodeCustomerId,
          hasPassword: !!creds.passwordEncrypted,
        }
      : null,
  }
}
```

- [ ] **Step 7: Typecheck and checkpoint**

Run: `npx tsc --noEmit && npx vitest run tests/lib/tenant/`
Expected: geen fouten, PASS.

---

### Task 5: De POC verhuist naar `src/components/mailing-flow/`

Puur verplaatsen en hernoemen; het gedrag blijft gelijk. `/masspost/poc` blijft tijdelijk werken (tot taak 11), zodat de app tussendoor bouwt.

**Files:**
- Move: `src/app/(tools)/masspost/poc/{FormatStep,IssueRow,MappingStep,MetaPills,StatusIcons,StepBar,UploadStep}.tsx`, `{ai-suggestion,columns,save-file}.ts` → `src/components/mailing-flow/`
- Move + rename: `PocFlow.tsx` → `src/components/mailing-flow/MailingFlow.tsx`; `poc.module.css` → `src/components/mailing-flow/mailing-flow.module.css`
- Create: `src/components/app-shell/tokens.css`
- Delete: `MeasurePanel.tsx`, `demo-rows.ts`, `standalone.tsx`, `scripts/build-masspost-poc-standalone.ts`; script `build:poc` uit `package.json`
- Move: `tests/app/masspost/poc/{ai-suggestion,columns}.test.ts` → `tests/components/mailing-flow/`
- Modify: `src/app/(tools)/masspost/poc/page.tsx` (import uit de nieuwe plek)

**Interfaces:**
- Produces: `MailingFlow` (tijdelijk zelfde props als `PocFlow`: `{ docsUrl?: string; aiModel?: string }`; taak 10 wijzigt ze), `tokens.css` met de klasse `.app` en `.app[data-theme='dark']`.

- [ ] **Step 1: Move with git, so history follows**

```bash
mkdir -p src/components/mailing-flow tests/components/mailing-flow src/components/app-shell
cd "src/app/(tools)/masspost/poc"
for f in FormatStep.tsx IssueRow.tsx MappingStep.tsx MetaPills.tsx StatusIcons.tsx StepBar.tsx UploadStep.tsx ai-suggestion.ts columns.ts save-file.ts; do git mv "$f" ../../../../components/mailing-flow/; done
git mv PocFlow.tsx ../../../../components/mailing-flow/MailingFlow.tsx
git mv poc.module.css ../../../../components/mailing-flow/mailing-flow.module.css
git rm MeasurePanel.tsx demo-rows.ts standalone.tsx
cd - && git rm scripts/build-masspost-poc-standalone.ts
git mv tests/app/masspost/poc/ai-suggestion.test.ts tests/app/masspost/poc/columns.test.ts tests/components/mailing-flow/
```

- [ ] **Step 2: Fix imports and names**

- In elk verplaatst bestand: `./poc.module.css` → `./mailing-flow.module.css`.
- In `MailingFlow.tsx`: `export function PocFlow` → `export function MailingFlow`; verwijder `MeasurePanel`, `usedHeapMb`, `Measurement`, de state `measurement`, `checkedAt`, de `setMeasurement`-oproepen, `<MeasurePanel …/>`, de state `theme`, `toggleTheme`, de `<footer>` met de themaknop en `data-theme={theme}` op de root. `onRendered` aan `FormatStep` wordt `() => {}`.
- In `UploadStep.tsx`: verwijder de demo-knop en de import van `demo-rows`; `onLoaded(list, measurement, bytes)` wordt `onLoaded(list, bytes)`; verwijder de `Measurement`-code.
- In `MappingStep.tsx:239`: `callbackUrl=/masspost/poc` → `callbackUrl=/mailings`.
- In de twee verplaatste tests: imports `@/app/(tools)/masspost/poc/…` → `@/components/mailing-flow/…`.
- `package.json`: verwijder de regel `"build:poc": …`.
- `src/app/(tools)/masspost/poc/page.tsx`: `import { MailingFlow } from '@/components/mailing-flow/MailingFlow'` en render `<MailingFlow …/>`.

- [ ] **Step 3: Split the variables into `tokens.css`**

Kopieer de blokken `.root { --bg … color-scheme: light; }` (alleen de variabelen en `color-scheme`, `mailing-flow.module.css` regels 5–34) en `.root[data-theme='dark'] { … }` (regels 46–74) naar `src/components/app-shell/tokens.css`, met `.root` vervangen door `.app`. Voeg toe:

```css
/* src/components/app-shell/tokens.css — colour tokens of the app (from the POC, Geist).
   Light by default; dark only via the user menu (data-theme on .app). */
.app {
  /* …variabelen uit mailing-flow.module.css regels 6–33… */
  --orange: #f97316;
  --done: #52525b;
  --side-w: 248px;
  --side-w-collapsed: 56px;
}
.app[data-theme='dark'] {
  /* …variabelen uit mailing-flow.module.css regels 47–73… */
  --done: #71717a;
}
```

Verwijder in `mailing-flow.module.css` de variabelen uit `.root` en het hele blok `.root[data-theme='dark']`; `.root` houdt enkel layout, achtergrond, kleur en lettertype. Verwijder ook `.footer`. Importeer `tokens.css` in `src/app/(tools)/masspost/poc/page.tsx` (tijdelijk) en zet daar `<div className="app">` rond de flow.

- [ ] **Step 4: Run tests, typecheck and look**

Run: `npx vitest run tests/components/mailing-flow/ && npx tsc --noEmit && npm run lint`
Expected: PASS, geen fouten. Start de preview (`preview_start`) en open `/masspost/poc`: inlezen, koppelen en formaatvalidatie werken zoals voorheen, in licht.

- [ ] **Step 5: Checkpoint** — niet committen.

---

### Task 6: App-shell, home en login-check

Laad eerst `.agent/prompts/customer-facing-agent.md`.

**Files:**
- Create: `src/components/app-shell/{AppShell,Sidebar,UserMenu,Placeholder}.tsx`, `useStoredPreference.ts`, `shell.module.css`, `actions.ts`
- Create: `src/app/(app)/layout.tsx`, `src/app/(app)/deposits/page.tsx`
- Modify: `src/app/page.tsx` (vervangen), `src/app/layout.tsx` (titel en beschrijving)
- Test: `tests/components/app-shell/useStoredPreference.test.ts`

**Interfaces:**
- Consumes: `tokens.css` (taak 5), `getTenantSettings` (taak 4), `auth`, `signIn`, `signOut` uit `@/lib/auth`.
- Produces:
  - `readStoredPreference<T extends string>(key: string, allowed: readonly T[], fallback: T, storage?: Storage): T` en `writeStoredPreference(key, value, storage?)` (try/catch, sleutels met voorvoegsel `bpost-e-masspost:`)
  - `useStoredPreference<T extends string>(key, allowed, fallback): [T, (v: T) => void]`
  - `<AppShell tenantName user={{ name, email, image }}>{children}</AppShell>` (client)
  - `<Placeholder label="…" tip="…">` (inline element met "binnenkort")
  - `<PageHeader title actions?>` in `AppShell.tsx`: titel plus het icoon voor het paneel onder 1024 px
  - server action `signOutAction()`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/app-shell/useStoredPreference.test.ts
import { describe, it, expect } from 'vitest'
import { readStoredPreference, writeStoredPreference } from '@/components/app-shell/useStoredPreference'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

describe('stored preferences', () => {
  it('returns the fallback when nothing or something unknown is stored', () => {
    const s = memoryStorage()
    expect(readStoredPreference('theme', ['light', 'dark'] as const, 'light', s)).toBe('light')
    s.setItem('bpost-e-masspost:theme', 'purple')
    expect(readStoredPreference('theme', ['light', 'dark'] as const, 'light', s)).toBe('light')
  })
  it('round-trips a value under the app prefix', () => {
    const s = memoryStorage()
    writeStoredPreference('theme', 'dark', s)
    expect(s.getItem('bpost-e-masspost:theme')).toBe('dark')
    expect(readStoredPreference('theme', ['light', 'dark'] as const, 'light', s)).toBe('dark')
  })
  it('survives a storage that throws', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } } as unknown as Storage
    expect(readStoredPreference('theme', ['light', 'dark'] as const, 'light', broken)).toBe('light')
    expect(() => writeStoredPreference('theme', 'dark', broken)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/app-shell/`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Implement the preference helper**

```ts
// src/components/app-shell/useStoredPreference.ts
'use client'

import { useCallback, useEffect, useState } from 'react'

const PREFIX = 'bpost-e-masspost:'

/**
 * Reads a per-browser preference (theme, collapsed sidebar, sort, view). Never throws.
 * @param key Key without prefix.
 * @param allowed The allowed values.
 * @param fallback Value when nothing valid is stored.
 * @param storage Default `localStorage`.
 * @returns The stored value or the fallback.
 */
export function readStoredPreference<T extends string>(key: string, allowed: readonly T[], fallback: T, storage?: Storage): T {
  try {
    const value = (storage ?? globalThis.localStorage)?.getItem(PREFIX + key)
    return allowed.includes(value as T) ? (value as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * Stores a per-browser preference. Fails silently (private window, blocked storage).
 * @param key Key without prefix.
 * @param value The value.
 * @param storage Default `localStorage`.
 */
export function writeStoredPreference(key: string, value: string, storage?: Storage): void {
  try {
    ;(storage ?? globalThis.localStorage)?.setItem(PREFIX + key, value)
  } catch {
    // Not stored: the choice holds for this visit only.
  }
}

/**
 * A preference that starts at the fallback (same HTML on server and client) and takes the stored
 * value after mounting.
 * @param key Key without prefix.
 * @param allowed The allowed values.
 * @param fallback Default.
 * @returns The value and a setter that also stores it.
 */
export function useStoredPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback)
  useEffect(() => {
    setValue(readStoredPreference(key, allowed, fallback))
    // `allowed` is a constant per call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fallback])
  const set = useCallback(
    (v: T) => {
      setValue(v)
      writeStoredPreference(key, v)
    },
    [key],
  )
  return [value, set]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/app-shell/`
Expected: PASS.

- [ ] **Step 5: Build the shell components**

Markup en CSS komen uit de schets (`docs/ontwerp/webapp/app-shell.html`): CSS-regels 38–102 (tenant, menu's, zijbalk), 103–121 (inhoud), 170–177 (melding onderaan), 242–266 (smal scherm), en de HTML van `<aside id="side">` (regels ±300–358). Neem ze over in `shell.module.css` (klassen in camelCase, zonder de variant "donkerdere achtergrond" en zonder de schetsbediening, regels 76–80 en 235–241).

```tsx
// src/components/app-shell/AppShell.tsx
'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconLayoutSidebarLeftExpand } from '@tabler/icons-react'
import { Sidebar } from './Sidebar'
import { useStoredPreference } from './useStoredPreference'
import './tokens.css'
import styles from './shell.module.css'

/** The signed-in user, as shown at the bottom of the sidebar. */
export interface ShellUser {
  name: string
  email: string
  image?: string | null
}

const PanelContext = createContext<{ open: () => void }>({ open: () => {} })

/**
 * The app shell (SR-112 §4, decisions 23, 26, 27): a full-height sidebar without top bar, collapsible
 * to 56 px; below 1024 px a panel that slides in from the left.
 * @param props Tenant name, user and the page.
 */
export function AppShell({ tenantName, user, children }: { tenantName: string; user: ShellUser; children: ReactNode }) {
  const [theme, setTheme] = useStoredPreference('theme', ['light', 'dark'] as const, 'light')
  const [collapsed, setCollapsed] = useStoredPreference('sidebar', ['open', 'collapsed'] as const, 'open')
  const [panelOpen, setPanelOpen] = useState(false)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  function openPanel() {
    opener.current = document.activeElement as HTMLElement
    setPanelOpen(true)
  }
  function closePanel() {
    setPanelOpen(false)
    opener.current?.focus()
  }

  return (
    <div className={`app ${styles.shell}`} data-theme={theme} data-collapsed={collapsed === 'collapsed' || undefined}>
      <Sidebar
        tenantName={tenantName}
        user={user}
        collapsed={collapsed === 'collapsed'}
        onToggleCollapsed={() => setCollapsed(collapsed === 'collapsed' ? 'open' : 'collapsed')}
        dark={theme === 'dark'}
        onToggleDark={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        panelOpen={panelOpen}
        onClosePanel={closePanel}
      />
      {panelOpen && <div className={styles.scrim} onClick={closePanel} aria-hidden="true" />}
      <PanelContext.Provider value={{ open: openPanel }}>
        <main className={styles.content}>{children}</main>
      </PanelContext.Provider>
    </div>
  )
}

/**
 * Page title, with the icon that opens the sidebar panel below 1024 px, and optional actions right.
 * @param props Title and actions.
 */
export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  const { open } = useContext(PanelContext)
  return (
    <div className={styles.pageHeader}>
      <button type="button" className={styles.panelToggle} aria-label="Menu openen" onClick={open}>
        <IconLayoutSidebarLeftExpand size={18} stroke={1.75} aria-hidden="true" />
      </button>
      <div className={styles.pageTitle}>
        <h1 tabIndex={-1}>{title}</h1>
        {children}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  )
}
```

`Sidebar.tsx` (client) bevat:
- bovenaan: een vierkant met de beginletter van `tenantName` (achtergrond `var(--accent-bg)`, tekst `var(--accent-fg)`) en de naam (16 px, vet), met een lijn eronder;
- `<nav aria-label="Hoofdmenu">` met `next/link` naar `/mailings` (`IconMail`, "Mailings"), Deposits als `<Placeholder>` met `IconTruck` en tip "Dit onderdeel bouwen we nog", en `/archief` (`IconArchive`, "Archief"); onderaan apart `/instellingen` (`IconSettings`). Actief = `usePathname().startsWith(href)` → `aria-current="page"`, lichte achtergrond en blauw streepje;
- onderaan op één regel `<UserMenu>` en de knop in/uitklappen (`IconLayoutSidebarLeftCollapse` / `IconLayoutSidebarLeftExpand`, `aria-label` "Zijbalk inklappen" / "Zijbalk uitklappen", `aria-expanded`);
- ingeklapt: enkel iconen, met `data-tip` als hovertip;
- als paneel (`panelOpen`): `role="dialog"`, `aria-modal="true"`, `aria-label="Menu"`, een sluitknop (`IconX`, "Menu sluiten") bovenaan rechts, focus naar de eerste link bij het openen; een klik op een link sluit het paneel.

`UserMenu.tsx` (client): een knop met avatar (foto of initialen) en naam, `aria-haspopup="menu"`, `aria-expanded`; het menu opent naar boven met naam, e-mail, een `role="menuitemcheckbox"` "Donkere modus" (`aria-checked={dark}`) en een `<form action={signOutAction}>` met "Afmelden" (`IconLogout`). Esc of een klik ernaast sluit het menu; pijltjes bewegen tussen de items.

```ts
// src/components/app-shell/actions.ts
'use server'
import { signOut } from '@/lib/auth'

/** Signs the user out and goes back to the home page. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' })
}
```

```tsx
// src/components/app-shell/Placeholder.tsx
import type { ReactNode } from 'react'
import styles from './shell.module.css'

/**
 * Something that is not built yet: muted, labelled "binnenkort", focusable but not clickable
 * (SR-112 v1 decision 4).
 * @param props Content, and the hover tip.
 */
export function Placeholder({ children, tip = 'Dit onderdeel bouwen we nog' }: { children: ReactNode; tip?: string }) {
  return (
    <span className={styles.placeholder} aria-disabled="true" tabIndex={0} data-tip={tip}>
      {children}
      <span className={styles.soon}>binnenkort</span>
    </span>
  )
}
```

In `shell.module.css`: `.placeholder { opacity: .55; cursor: not-allowed; }` en `.soon { font-size: 11px; border: 1px solid var(--border); border-radius: 999px; padding: 0 6px; margin-left: 6px; color: var(--text-muted); }`.

- [ ] **Step 6: Layout, home and Deposits**

```tsx
// src/app/(app)/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
import { AppShell } from '@/components/app-shell/AppShell'

/** Everything behind the login: the shell with the tenant and the user. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user?.email || !session.user.tenantId) redirect('/')
  const settings = await getTenantSettings(session.user.tenantId)
  if (!settings) redirect('/')
  return (
    <AppShell
      tenantName={settings.name}
      user={{ name: session.user.name ?? session.user.email, email: session.user.email, image: session.user.image }}
    >
      {children}
    </AppShell>
  )
}
```

```tsx
// src/app/page.tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/lib/auth'
import '@/components/app-shell/tokens.css'
import styles from '@/components/app-shell/home.module.css'

export const metadata: Metadata = { title: 'Mailings voor e-MassPost' }

/** Home (SR-112 decision 6): only "Aanmelden met Google"; signed in, straight to the mailings. */
export default async function HomePage() {
  const session = await auth()
  if (session?.user) redirect('/mailings')
  async function signInWithGoogle() {
    'use server'
    await signIn('google', { redirectTo: '/mailings' })
  }
  return (
    <div className={`app ${styles.home}`}>
      <main className={styles.card}>
        <h1>Mailings voor e-MassPost</h1>
        <form action={signInWithGoogle}>
          <button type="submit" className={styles.primary}>Aanmelden met Google</button>
        </form>
      </main>
    </div>
  )
}
```

`home.module.css`: overnemen uit de schets, CSS-regels 224–234 (`/* —— Home —— */`).

```tsx
// src/app/(app)/deposits/page.tsx
import { PageHeader } from '@/components/app-shell/AppShell'

/** Deposits: not built yet (SR-112 decision 12). */
export default function DepositsPage() {
  return (
    <>
      <PageHeader title="Deposits" />
      <p>Dit onderdeel bouwen we nog. Hier volg je straks je afgiftes bij bpost op.</p>
    </>
  )
}
```

`src/app/layout.tsx`: `title: "Mailings voor e-MassPost"`, `description: "Mailings voorbereiden en opvolgen voor e-MassPost van bpost (alfa)."`.

- [ ] **Step 7: Verify in the preview**

Run: `npx tsc --noEmit && npm run lint`. Start de preview en kijk:
- `/` toont "Aanmelden met Google" wanneer niet aangemeld;
- aangemeld opent `/deposits` binnen de shell;
- in- en uitklappen blijft na herladen;
- Donkere modus blijft na herladen;
- op 1000 px breed opent het icoon het paneel, en Esc sluit het met de focus terug op het icoon.

Expected: alles zoals beschreven. Neem een screenshot in licht en donker.

- [ ] **Step 8: Checkpoint** — niet committen.

---

### Task 7: Mailinglijst en Archief

**Files:**
- Create: `src/components/mailings/{MailingStoreProvider,MailingList,MailingRow,RowMenu,StatusIcon}.tsx`, `list.module.css`, `labels.ts`
- Create: `src/app/(app)/mailings/page.tsx`, `src/app/(app)/archief/page.tsx`
- Test: `tests/components/mailings/labels.test.ts`

**Interfaces:**
- Consumes: `MailingStore`, `IndexedDbMailingStore`, `StoreUnavailableError`, `sortMailings`, `MailingSort`, `MailingSummary`, `MailingListItem` (taak 1–3); `PageHeader`, `Placeholder`, `useStoredPreference` (taak 6).
- Produces:
  - `<MailingStoreProvider user={{ email }}>` en `useMailingStore(): { store: MailingStore; user: { email: string } }` (één `IndexedDbMailingStore` per tabblad)
  - `filterMailings(items: MailingSummary[], query: string): MailingSummary[]` (code, titel, klant; hoofdletterongevoelig, zonder accenten)
  - `statusLabel(s: MailingSummary): string` (de tekst uit `statusiconen.html`, met het aantal open fouten bij `format`)
  - `arrTone(arr: number): 'red' | 'orange' | 'green'` (onder 96, 96 tot 98, vanaf 98)
  - `<MailingList archived: boolean>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/mailings/labels.test.ts
import { describe, it, expect } from 'vitest'
import { arrTone, filterMailings, statusLabel } from '@/components/mailings/labels'
import { summarize } from '@/core/masspost/store/mailing'
import { sampleMailing } from '../../core/masspost/store/mailing.test'

const row = (over = {}) => ({ ...summarize(sampleMailing()), ...over })

describe('filterMailings', () => {
  it('matches code, title and customer, ignoring case and accents', () => {
    const items = [row({ id: '1', title: 'Nieuwsbrief café' }), row({ id: '2', code: 'CP-2026-2', title: 'Uitnodiging', customer: 'Harmonie' })]
    expect(filterMailings(items, 'CAFE').map((m) => m.id)).toEqual(['1'])
    expect(filterMailings(items, 'harm').map((m) => m.id)).toEqual(['2'])
    expect(filterMailings(items, 'cp-2026-2').map((m) => m.id)).toEqual(['2'])
    expect(filterMailings(items, '  ')).toHaveLength(2)
  })
})

describe('statusLabel and arrTone', () => {
  it('names the status, with the open format errors', () => {
    expect(statusLabel(row({ status: 'uploaded' }))).toBe('Opgeladen · kolommen koppelen')
    expect(statusLabel(row({ status: 'format', formatIssuesOpen: 26 }))).toBe('Formaatvalidatie · 26 open')
    expect(statusLabel(row({ status: 'format', formatIssuesOpen: 0 }))).toBe('Formaatvalidatie · in orde, klaar voor adrescontrole')
  })
  it('colours the ARR as in decision 21', () => {
    expect(arrTone(95.9)).toBe('red')
    expect(arrTone(96)).toBe('orange')
    expect(arrTone(97.99)).toBe('orange')
    expect(arrTone(98)).toBe('green')
  })
})
```

`sampleMailing` wordt uit `mailing.test.ts` geïmporteerd; dat bestand exporteert het al (taak 1).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/mailings/`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Implement the labels**

```ts
// src/components/mailings/labels.ts
import type { MailingStatus, MailingSummary } from '@/core/masspost/store/mailing'

const LABELS: Record<MailingStatus, string> = {
  uploaded: 'Opgeladen · kolommen koppelen',
  mapped: 'Kolommen gekoppeld',
  format: 'Formaatvalidatie',
  checked: 'Gecontroleerd door bpost',
  submitted: 'Ingediend',
  overdue: 'Ingediend · afgiftedatum voorbij, al afgegeven?',
  done: 'Afgerond',
  withdrawn: 'Ingetrokken',
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Filters the list on code, title and customer.
 * @param items The rows.
 * @param query What the user typed.
 * @returns The matching rows; all rows for an empty query.
 */
export function filterMailings(items: readonly MailingSummary[], query: string): MailingSummary[] {
  const q = fold(query.trim())
  if (!q) return [...items]
  return items.filter((m) => [m.code, m.title, m.customer].some((v) => fold(v).includes(q)))
}

/**
 * The status in words, for the hover tip and screen readers.
 * @param m The row.
 * @returns E.g. "Formaatvalidatie · 26 open".
 */
export function statusLabel(m: MailingSummary): string {
  if (m.status !== 'format' || m.formatIssuesOpen === null) return LABELS[m.status]
  return m.formatIssuesOpen === 0
    ? 'Formaatvalidatie · in orde, klaar voor adrescontrole'
    : `Formaatvalidatie · ${m.formatIssuesOpen} open`
}

/**
 * Colour of the ARR dot (decision 21 of 02/10).
 * @param arr Percentage.
 * @returns red below 96, orange from 96 to 98, green from 98.
 */
export function arrTone(arr: number): 'red' | 'orange' | 'green' {
  return arr < 96 ? 'red' : arr < 98 ? 'orange' : 'green'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/mailings/`
Expected: PASS.

- [ ] **Step 5: Build the provider, the list and the pages**

```tsx
// src/components/mailings/MailingStoreProvider.tsx
'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { IndexedDbMailingStore } from '@/core/masspost/store/indexeddb-store'
import type { MailingStore } from '@/core/masspost/store/mailing-store'

const Ctx = createContext<{ store: MailingStore; user: { email: string } } | null>(null)

/**
 * One mailing store per tab. v1: IndexedDB; mijlpaal 2 swaps in the Drive store here only.
 * @param props The signed-in user and the page.
 */
export function MailingStoreProvider({ user, children }: { user: { email: string }; children: ReactNode }) {
  const store = useMemo(() => new IndexedDbMailingStore(), [])
  return <Ctx.Provider value={{ store, user }}>{children}</Ctx.Provider>
}

/** The store and the user; only inside `MailingStoreProvider`. */
export function useMailingStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMailingStore outside MailingStoreProvider')
  return ctx
}
```

Zet `<MailingStoreProvider user={{ email: session.user.email }}>` in `src/app/(app)/layout.tsx` rond `{children}` (binnen `AppShell`).

`MailingList.tsx` (client), volgens SR-112 §4 en de schets (CSS-regels 122–169, HTML `data-view="mailings archief"` regels 360–399, JS `render()` in het script):
- laadt `store.list()` in een `useEffect`; tijdens het laden een skelet met `aria-busy="true"`;
- `StoreUnavailableError` → melding met de exacte tekst uit Global Constraints en een knop "Opnieuw proberen" die opnieuw laadt;
- filtert `archived === props.archived`; onleesbare items (`ok: false`) als rij "Kan deze mailing niet lezen" (enkel in Mailings);
- titel via `<PageHeader title={archived ? 'Archief' : 'Mailings'} actions={!archived && <Link href="/mailings/nieuw" className="btnPrimary"><IconPlus/> Nieuwe mailing</Link>}>`;
- onder de titel de vaste melding "Je mailings staan voorlopig enkel in deze browser." (klasse `.note`, rustig, geen waarschuwingskleur);
- zoekveld (`IconSearch`, label "Zoek op code, titel of klant"); `/` zet de focus erin (behalve als de focus al in een invoerveld staat), Esc maakt het leeg;
- kop "N mailings" met rechts **Sorteren** (menu met de vijf keuzes, `useStoredPreference('sort', [...], 'status')`) en **Weergave** (één of twee regels, `useStoredPreference('view', ['one','two'], 'one')`); onder ±860 px containerbreedte (`ResizeObserver` op het kader) altijd twee regels en de schakelaar verborgen;
- rijen uit `sortMailings(filterMailings(...), sort)`;
- lege staten: "Nog geen mailings" met de knop "Nieuwe mailing", "Niets gevonden voor '…'", in het Archief "Nog niets gearchiveerd".

`MailingRow.tsx`: statusicoon (`StatusIcon`, Harvey ball zoals `ball()`/`full()` in het schetsscript, met `title` en `<span className="sr-only">` = `statusLabel`), code (mono), titel als `next/link` naar `/mailings/<code>`, klant-pill, envelop-pill met het aantal (oranje onder 500), ARR (bolletje `arrTone` + percentage, of niets), afgiftedatum (`d MMM yyyy` in `nl-BE`), en `RowMenu`.

`RowMenu.tsx`: knop "…" (`IconDots`, `aria-label="Acties voor <code>"`), menu met Openen en Archiveren (in het Archief: Openen en Terugzetten), en als `Placeholder` Afgegeven markeren en Intrekken. Archiveren roept `store.archive(id, user.email)`, laadt de lijst opnieuw en toont onderaan "<code> is gearchiveerd · Ongedaan maken" (8 s, `role="status"`); Ongedaan maken roept `store.restore`.

```tsx
// src/app/(app)/mailings/page.tsx
import { MailingList } from '@/components/mailings/MailingList'

/** The list of mailings (SR-112 §4). */
export default function MailingsPage() {
  return <MailingList archived={false} />
}
```

```tsx
// src/app/(app)/archief/page.tsx
import { MailingList } from '@/components/mailings/MailingList'

/** Mailings someone archived by hand (SR-112 decision 11). */
export default function ArchivePage() {
  return <MailingList archived />
}
```

- [ ] **Step 6: Verify in the preview**

Er zijn nog geen mailings (die komen met taak 9; de lijst met echte rijen wordt in taak 10, stap 9, nagekeken). Controleer nu: de lege staat "Nog geen mailings", de melding over de browser, de knop "Nieuwe mailing", `/` in het zoekveld, en het lege Archief.

Run: `npx tsc --noEmit && npm run lint`
Expected: geen fouten.

- [ ] **Step 7: Checkpoint** — niet committen.

---

### Task 8: Instellingen (vervangt het dashboard)

**Files:**
- Create: `src/app/(app)/instellingen/page.tsx`, `src/app/(app)/instellingen/actions.ts`, `src/components/settings/SettingsForms.tsx`, `src/components/settings/settings.module.css`
- Modify: `src/app/oauth/authorize/route.ts:104-107` (doorverwijzing)
- Test: `tests/app/instellingen/actions.test.ts`

**Interfaces:**
- Consumes: `getTenantSettings`, `organisationSchema`, `defaultsSchema`, `bpostCredentialsSchema` (taak 4); `encrypt` uit `@/lib/crypto`; `PageHeader`, `Placeholder` (taak 6).
- Produces: server actions `saveOrganisation(prev, formData)`, `saveDefaults(prev, formData)`, `saveBpost(prev, formData)`, elk `Promise<SettingsResult>` met `type SettingsResult = { ok: true; message: string } | { ok: false; error: string } | null`.

- [ ] **Step 1: Write the failing test**

Volg het patroon van `tests/app/dashboard/actions.test.ts` (die mockt `@/lib/auth` en `@/lib/db/client`). Lees dat bestand eerst en kopieer de mocks.

```ts
// tests/app/instellingen/actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const authMock = vi.fn()
const upsert = vi.fn()
vi.mock('@/lib/auth', () => ({ auth: () => authMock() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/db/client', () => ({
  db: {
    update: () => ({ set: (v: unknown) => ({ where: () => upsert('tenants', v) }) }),
    insert: () => ({ values: (v: unknown) => ({ onConflictDoUpdate: () => upsert('insert', v) }) }),
  },
}))

import { saveDefaults, saveOrganisation } from '@/app/(app)/instellingen/actions'

const form = (o: Record<string, string>) => {
  const f = new FormData()
  Object.entries(o).forEach(([k, v]) => f.set(k, v))
  return f
}

describe('instellingen actions', () => {
  beforeEach(() => {
    authMock.mockReset()
    upsert.mockReset()
  })

  it('refuses without a session', async () => {
    authMock.mockResolvedValue(null)
    expect(await saveOrganisation(null, form({ name: 'X' }))).toEqual({ ok: false, error: 'Je sessie is verlopen. Meld je opnieuw aan.' })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('saves the organisation name', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    expect(await saveOrganisation(null, form({ name: ' Contrapunt ' }))).toEqual({ ok: true, message: 'Bewaard.' })
    expect(upsert).toHaveBeenCalledWith('tenants', { name: 'Contrapunt' })
  })

  it('explains a wrong prefix in plain words', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    const r = await saveDefaults(null, form({ format: 'Small', priority: 'NP', genMID: '7', codePrefix: 'C P' }))
    expect(r).toEqual({ ok: false, error: 'Het voorvoegsel mag enkel letters en cijfers bevatten, maximaal 8.' })
  })

  it('saves the defaults', async () => {
    authMock.mockResolvedValue({ user: { tenantId: 't1' } })
    expect(await saveDefaults(null, form({ format: 'Large', priority: 'P', genMID: 'N', genPSC: 'Y', codePrefix: 'cp' }))).toEqual({
      ok: true,
      message: 'Bewaard.',
    })
    expect(upsert).toHaveBeenCalledWith('insert', expect.objectContaining({ tenantId: 't1', defaultFormat: 'Large', codePrefix: 'CP' }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/instellingen/`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Implement the actions**

```ts
// src/app/(app)/instellingen/actions.ts
'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { bpostCredentials, tenantPreferences, tenants } from '@/lib/db/schema'
import { encrypt } from '@/lib/crypto'
import { bpostCredentialsSchema, defaultsSchema, organisationSchema } from '@/lib/tenant/settings-schema'

/** Outcome of a settings form, shown under its button. */
export type SettingsResult = { ok: true; message: string } | { ok: false; error: string } | null

const EXPIRED = { ok: false as const, error: 'Je sessie is verlopen. Meld je opnieuw aan.' }
const SAVED = { ok: true as const, message: 'Bewaard.' }

async function tenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

/** Saves the name of the organisation. */
export async function saveOrganisation(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const id = await tenantId()
  if (!id) return EXPIRED
  const parsed = organisationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Vul een naam in van maximaal 100 tekens.' }
  await db.update(tenants).set({ name: parsed.data.name }).where(eq(tenants.id, id))
  revalidatePath('/', 'layout')
  return SAVED
}

/** Saves the defaults for a new mailing. */
export async function saveDefaults(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const id = await tenantId()
  if (!id) return EXPIRED
  const parsed = defaultsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    const prefix = parsed.error.issues.some((i) => i.path[0] === 'codePrefix')
    return { ok: false, error: prefix ? 'Het voorvoegsel mag enkel letters en cijfers bevatten, maximaal 8.' : 'Kies een geldige waarde.' }
  }
  const d = parsed.data
  const values = {
    tenantId: id,
    defaultFormat: d.format,
    defaultPriority: d.priority,
    defaultGenMid: d.genMID,
    defaultPresort: d.genPSC,
    codePrefix: d.codePrefix || null,
  }
  await db
    .insert(tenantPreferences)
    .values(values)
    .onConflictDoUpdate({
      target: tenantPreferences.tenantId,
      set: {
        defaultFormat: sql`excluded.default_format`,
        defaultPriority: sql`excluded.default_priority`,
        defaultGenMid: sql`excluded.default_gen_mid`,
        defaultPresort: sql`excluded.default_presort`,
        codePrefix: sql`excluded.code_prefix`,
        updatedAt: new Date(),
      },
    })
  return SAVED
}

/** Saves the bpost login. An empty password keeps the stored one. */
export async function saveBpost(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const id = await tenantId()
  if (!id) return EXPIRED
  const parsed = bpostCredentialsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Vul alle velden in. Het barcode-klant-ID heeft 5 cijfers.' }
  const { password, ...rest } = parsed.data
  const key = process.env.ENCRYPTION_KEY
  if (!key) return { ok: false, error: 'Bewaren lukt nu niet. Probeer het later opnieuw.' }
  const [existing] = await db.select().from(bpostCredentials).where(eq(bpostCredentials.tenantId, id)).limit(1)
  if (!existing && !password) return { ok: false, error: 'Vul je bpost-wachtwoord in.' }
  const secret = password ? encrypt(password, key) : { encrypted: existing!.passwordEncrypted, iv: existing!.passwordIv }
  // Same columns as saveCreds in the former src/app/dashboard/page.tsx.
  await db
    .insert(bpostCredentials)
    .values({ tenantId: id, ...rest, passwordEncrypted: secret.encrypted, passwordIv: secret.iv })
    .onConflictDoUpdate({
      target: bpostCredentials.tenantId,
      set: { ...rest, passwordEncrypted: secret.encrypted, passwordIv: secret.iv, updatedAt: new Date() },
    })
  return SAVED
}
```

Kijk vóór het schrijven in `src/app/dashboard/page.tsx` (`saveCreds`, regels ±70–135) hoe `encrypt` precies aangeroepen wordt en wat het teruggeeft. Neem dat letterlijk over, ook als de vorm verschilt van `{ encrypted, iv }`. Controleer ook of `bpostCredentials.tenantId` een unieke sleutel heeft (nodig voor `onConflictDoUpdate`); zo niet, doe het zoals `saveCreds`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/app/instellingen/`
Expected: PASS.

- [ ] **Step 5: Page and forms**

`page.tsx` (server): `auth()`, `getTenantSettings(tenantId)`, en geeft `settings` aan `<SettingsForms>`.

`SettingsForms.tsx` (client, `useActionState` per formulier), volgens de schets (`data-view="instellingen"`, regels 409–447, CSS-regels 178–223), vier kaarten:
1. **Organisatie:** naam; domein als `Placeholder` ("Komt met de koppeling aan Google Workspace").
2. **bpost:** gebruikersnaam, wachtwoord (`type="password"`, `autoComplete="new-password"`, placeholder "Laat leeg om te behouden" als `hasPassword`), klantnummer (PRS), account-ID, barcode-klant-ID.
3. **Standaardwaarden:** formaat (Klein formaat = `Small`, Groot formaat = `Large`), prioriteit (Non-prior = `NP`, Prior = `P`), barcode (`N` Geen · `7` bpost, 7 cijfers · `9` · `11`; "Contrapunt, 11 cijfers" als `<option disabled>` met "(binnenkort)"), presortering (checkbox `name="genPSC" value="Y"`), voorvoegsel (placeholder = `defaults.codePrefix` als `storedCodePrefix` leeg is) met hint "Codes worden dan bv. CP-2026-15".
4. **Google Drive:** de hele kaart als `Placeholder` met `IconBrandGoogleDrive`: "Gedeelde drive" en "Hoofdmap bpost-e-masspost".

Elke kaart heeft zijn eigen knop "Bewaren" en toont de uitkomst eronder (`role="status"`, fout in `var(--red)`).

- [ ] **Step 6: Redirect the MCP login to the landing page**

Mark, 12/10: wie via de MCP-login of `/install` binnenkomt, gaat naar de landingspagina `/`. In `src/app/oauth/authorize/route.ts` regels 104–107: vervang de doorverwijzing naar `/dashboard?setup=credentials&returnTo=…` door `NextResponse.redirect(new URL('/', publicBase).toString(), 302)`. Er is geen `returnTo` meer. Pas `tests/app/oauth/…` aan als een test `/dashboard` verwacht (`grep -rn "/dashboard" tests/app/oauth`). Instellingen leest dus geen `setup` of `returnTo`: schrap die zin uit stap 5.

- [ ] **Step 7: Verify**

Run: `npx vitest run tests/app/ && npx tsc --noEmit && npm run lint`
Expected: PASS. In de preview: `/instellingen` toont de vier kaarten; een naam bewaren verandert de naam bovenaan de zijbalk na herladen. **De database wordt pas aangesproken na `db:push` (taak 4, stap 5, met akkoord van Mark).**

- [ ] **Step 8: Checkpoint** — niet committen.

---

### Task 9: Stap 1 Importeren (`/mailings/nieuw`)

**Files:**
- Create: `src/components/mailing-flow/ImportStep.tsx`, `src/components/mailing-flow/import-draft.ts`, `src/app/(app)/mailings/nieuw/page.tsx`
- Modify: `src/components/mailing-flow/UploadStep.tsx` → wordt `FileDrop.tsx` (sleepvak + kaartje), `mailing-flow.module.css` (velden, kaartje; CSS-regels 178–223 van de schets)
- Test: `tests/components/mailing-flow/import-draft.test.ts`

**Interfaces:**
- Consumes: `missingDetails`, `nextMailingCode`, `presortLocked`, `defaultRoundSequence`, `roundSequenceAllowed`, `isValidMailingCode`, `MailingDetails` (taak 1); `useMailingStore` (taak 7); `TenantDefaults` (taak 4); `StepBar`, `LoadedList`, `formatCount`, `MIN_ADDRESSES`, `SOFT_LIMIT`, `HARD_LIMIT`, `nextPaint` (taak 5); `sha256Hex`, `CodeTakenError` (taak 2).
- Produces:
  - `interface ImportDraft { customer: string; title: string; code: string; expectedDeliveryDate: string; format: 'Small'|'Large'; priority: 'NP'|'P'; genMID: 'N'|'7'|'9'|'11'; genPSC: 'Y'|'N'; roundAndSequence: boolean; roundSequenceTouched: boolean }`
  - `initialDraft(defaults: TenantDefaults, code: string): ImportDraft`
  - `withFile(draft, fileName: string, addresses: number): ImportDraft` (titel uit bestandsnaam als leeg; presort vast; R&S-standaard zolang niet aangeraakt)
  - `withFormat(draft, format, addresses: number | null): ImportDraft`
  - `toDetails(draft): MailingDetails`
  - `missingText(missing: MissingDetail[]): string` → "Nog nodig: een titel, een afgiftedatum, je adreslijst."
  - `<ImportStep defaults existingCustomers? mode="new" | { mode: 'edit'; mailing: Mailing }>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/mailing-flow/import-draft.test.ts
import { describe, it, expect } from 'vitest'
import { initialDraft, missingText, toDetails, withFile, withFormat } from '@/components/mailing-flow/import-draft'

const defaults = { format: 'Small', priority: 'NP', genMID: '7', genPSC: 'N', codePrefix: 'CP' } as const

describe('import draft', () => {
  it('starts from the tenant defaults and the proposed code', () => {
    expect(initialDraft(defaults, 'CP-2026-15')).toMatchObject({ code: 'CP-2026-15', format: 'Small', genMID: '7', genPSC: 'N', title: '' })
  })

  it('takes the file name as title when the title is empty, but not over a typed title', () => {
    expect(withFile(initialDraft(defaults, 'X'), 'Nieuwsbrief december.xlsx', 800).title).toBe('Nieuwsbrief december')
    const typed = { ...initialDraft(defaults, 'X'), title: 'Mijn titel' }
    expect(withFile(typed, 'a.xlsx', 800).title).toBe('Mijn titel')
  })

  it('locks presort on for small format from 25,000 addresses', () => {
    expect(withFile(initialDraft(defaults, 'X'), 'a.xlsx', 25_000).genPSC).toBe('Y')
  })

  it('round and sequence: only large, default on from 10,000, until the user chooses', () => {
    const large = withFormat(initialDraft(defaults, 'X'), 'Large', null)
    expect(withFile(large, 'a.xlsx', 12_000).roundAndSequence).toBe(true)
    const chosen = { ...withFile(large, 'a.xlsx', 12_000), roundAndSequence: false, roundSequenceTouched: true }
    expect(withFile(chosen, 'b.xlsx', 20_000).roundAndSequence).toBe(false)
    expect(withFormat(chosen, 'Small', 20_000).roundAndSequence).toBe(false)
  })

  it('maps to the mailing details, trimming text', () => {
    const d = { ...initialDraft(defaults, 'CP-2026-1'), title: ' T ', customer: ' K ', expectedDeliveryDate: '2026-10-24' }
    expect(toDetails(d)).toEqual({
      code: 'CP-2026-1',
      title: 'T',
      customer: { name: 'K', crmId: null },
      expectedDeliveryDate: '2026-10-24',
      format: 'Small',
      priority: 'NP',
      genMID: '7',
      genPSC: 'N',
      roundAndSequence: false,
    })
  })

  it('says what is still missing in one sentence', () => {
    expect(missingText(['title', 'date', 'file'])).toBe('Nog nodig: een titel, een afgiftedatum, je adreslijst.')
    expect(missingText(['code'])).toBe('Nog nodig: een geldige code.')
    expect(missingText([])).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/mailing-flow/import-draft.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Implement the draft logic**

```ts
// src/components/mailing-flow/import-draft.ts
import {
  defaultRoundSequence,
  presortLocked,
  roundSequenceAllowed,
  type MailingDetails,
  type MissingDetail,
} from '@/core/masspost/store/mailing'
import type { TenantDefaults } from '@/lib/tenant/settings'

/** The fields of step 1 while the user fills them in. */
export interface ImportDraft {
  customer: string
  title: string
  code: string
  expectedDeliveryDate: string
  format: 'Small' | 'Large'
  priority: 'NP' | 'P'
  genMID: 'N' | '7' | '9' | '11'
  genPSC: 'Y' | 'N'
  roundAndSequence: boolean
  /** The user chose round and sequence; the default no longer applies. */
  roundSequenceTouched: boolean
}

/**
 * Step 1 with the tenant defaults and the proposed code.
 * @param defaults From Instellingen.
 * @param code The proposed code.
 * @returns An empty draft.
 */
export function initialDraft(defaults: TenantDefaults, code: string): ImportDraft {
  return {
    customer: '',
    title: '',
    code,
    expectedDeliveryDate: '',
    format: defaults.format,
    priority: defaults.priority,
    genMID: defaults.genMID,
    genPSC: defaults.genPSC,
    roundAndSequence: false,
    roundSequenceTouched: false,
  }
}

function applyRules(d: ImportDraft, addresses: number | null): ImportDraft {
  const n = addresses ?? 0
  return {
    ...d,
    genPSC: presortLocked(d.format, n) ? 'Y' : d.genPSC,
    roundAndSequence: !roundSequenceAllowed(d.format)
      ? false
      : d.roundSequenceTouched
        ? d.roundAndSequence
        : defaultRoundSequence(d.format, n),
  }
}

/**
 * After a file was read: the file name becomes the title when it is empty, and the rules for presort
 * and round and sequence follow the number of addresses.
 * @param d The draft.
 * @param fileName Name of the Excel file.
 * @param addresses Number of addresses read.
 * @returns The new draft.
 */
export function withFile(d: ImportDraft, fileName: string, addresses: number): ImportDraft {
  const title = d.title.trim() ? d.title : fileName.replace(/\.xlsx?$/i, '')
  return applyRules({ ...d, title }, addresses)
}

/**
 * After the format changed.
 * @param d The draft.
 * @param format Small or Large.
 * @param addresses Number of addresses, null when no file yet.
 * @returns The new draft.
 */
export function withFormat(d: ImportDraft, format: ImportDraft['format'], addresses: number | null): ImportDraft {
  return applyRules({ ...d, format }, addresses)
}

/**
 * The details to store.
 * @param d The draft.
 * @returns The mailing details.
 */
export function toDetails(d: ImportDraft): MailingDetails {
  return {
    code: d.code.trim(),
    title: d.title.trim(),
    customer: { name: d.customer.trim(), crmId: null },
    expectedDeliveryDate: d.expectedDeliveryDate,
    format: d.format,
    priority: d.priority,
    genMID: d.genMID,
    genPSC: d.genPSC,
    roundAndSequence: d.roundAndSequence,
  }
}

const WORDS: Record<MissingDetail, string> = {
  title: 'een titel',
  code: 'een geldige code',
  date: 'een afgiftedatum',
  file: 'je adreslijst',
}

/**
 * "Nog nodig: …" under the title of step 1.
 * @param missing From `missingDetails`.
 * @returns The sentence, or an empty string.
 */
export function missingText(missing: readonly MissingDetail[]): string {
  return missing.length ? `Nog nodig: ${missing.map((m) => WORDS[m]).join(', ')}.` : ''
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/mailing-flow/import-draft.test.ts`
Expected: PASS.

- [ ] **Step 5: The page and the component**

```tsx
// src/app/(app)/mailings/nieuw/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
import { ImportStep } from '@/components/mailing-flow/ImportStep'

/** Step 1 of a new mailing (SR-112 §5). */
export default async function NewMailingPage() {
  const session = await auth()
  const settings = session?.user?.tenantId ? await getTenantSettings(session.user.tenantId) : null
  if (!settings) redirect('/')
  return <ImportStep defaults={settings.defaults} />
}
```

`ImportStep.tsx` (client), volgens de schets (`data-view="nieuw"`, regels 448–491) en SR-112 §5:
- bovenaan `<StepBar current="upload" …>` met enkel stap 1 bereikbaar, `position: sticky`;
- `PageHeader` "Nieuwe mailing" met de uitleg, `missingText(...)` (`role="status"`) en rechts de zwarte knop **Verder naar koppelen** (`disabled` zolang `missingDetails(...)` niet leeg is of het bestand niet zonder fout ingelezen is);
- de kaart *Gegevens van de mailing* met de velden uit de schets; `<input list>` met de klanten uit `store.list()` (uniek, gesorteerd); naast Klant een `Placeholder` met `IconPlugConnected` en tip "Koppeling met je CRM komt later";
- de code: bij het laden `nextMailingCode(defaults.codePrefix, new Date().getFullYear(), alleCodes)` met de hint "Volgend vrij nummer";
- de afgiftedatum: `min` = vandaag (lokaal, `YYYY-MM-DD`);
- presortering `disabled` en aangevinkt als `presortLocked`, met de hint "Verplicht bij klein formaat vanaf 25.000 adressen."; ronde en sequentie `disabled` als `!roundSequenceAllowed`, met de hint "Enkel bij groot formaat.";
- `FileDrop` (ex-`UploadStep`): sleepvak grijs enkel tijdens het slepen (`dragging`), na het inlezen een kaartje met bestandsnaam, `formatCount(n)` adressen en "Ander bestand kiezen"; leesfout in rood (`role="alert"`); de waarschuwingen voor <500, >25.000 en de stop >150.000 zoals in de POC; de onderste zin: "Het bestand blijft in je browser." (niet "gedeelde drive": dat komt in mijlpaal 2);
- **Verder:**
  1. `store.findByCode(code)`: bestaat ze, dan onder het veld code "Deze code bestaat al. Volgende vrije: <nextMailingCode(...)>" en stop;
  2. `sha256Hex(bytes)`, dan `store.create({ details: toDetails(draft), source: { name, size, sha256 }, addresses: list.rows.length }, new Blob([bytes], { type: file.type }), user.email)`;
  3. `CodeTakenError` → dezelfde melding als in 1; `StoreUnavailableError` → de melding uit Global Constraints;
  4. `router.push('/mailings/' + encodeURIComponent(code))`.
- **Weggaan** met ingevulde gegevens (een veld anders dan de start, of een bestand): `beforeunload` voor herladen en tabblad sluiten; voor links in de zijbalk een klik-vanger in de capture-fase op `a[href]` die een eigen `<dialog>` toont: "Deze mailing is nog niet aangemaakt. Als je nu weggaat, ben je de ingevulde gegevens en de gekozen adreslijst kwijt." met **Weggaan** en **Blijven** (Blijven heeft de focus). Na "Verder" valt de vraag weg.

Bij `mode: 'edit'` (taak 10): velden gevuld uit de mailing, code en bestand alleen-lezen (kaartje zonder "Ander bestand kiezen"), knop **Bewaren** in plaats van Verder; bewaren = `store.update(id, toDetails-zonder-code, revision, email, 'details')`.

- [ ] **Step 6: Verify in the preview**

Run: `npx tsc --noEmit && npm run lint`. In de preview op `/mailings/nieuw`:
- "Verder" is grijs met "Nog nodig: een titel, een afgiftedatum, je adreslijst.";
- kies `docs/samples/` (een Excel van Contrapunt): het kaartje verschijnt, de titel wordt de bestandsnaam;
- vul een datum in: "Verder" wordt actief;
- klik Mailings in de zijbalk: de vraag verschijnt; kies Blijven;
- klik Verder: de URL wordt `/mailings/CP-2026-1` (pagina komt in taak 10; een 404 is hier nog goed);
- `/mailings` toont de nieuwe mailing met status "Opgeladen · kolommen koppelen".

- [ ] **Step 7: Checkpoint** — niet committen.

---

### Task 10: De flow per mailing — bewaren en hervatten (`/mailings/[code]`)

**Files:**
- Create: `src/components/mailing-flow/resume.ts`, `src/components/mailing-flow/useMailingSaver.ts`, `src/components/mailing-flow/MailingPage.tsx`, `src/app/(app)/mailings/[code]/page.tsx`
- Modify: `src/components/mailing-flow/MailingFlow.tsx` (props en bewaarmomenten), `src/components/mailing-flow/FormatStep.tsx` (beginwaarden en `onChange`)
- Test: `tests/components/mailing-flow/resume.test.ts`

**Interfaces:**
- Consumes: `Mailing`, `MailingStore`, `RevisionConflictError`, `UnreadableMailingError` (taak 1–3); `useMailingStore` (taak 7); `ImportStep` met `mode: 'edit'` (taak 9); `StepId` uit `StepBar`.
- Produces:
  - `resumeStep(m: Mailing): StepId` — `upload` nooit; `mapping` zonder koppeling; `format` met koppeling en open fouten (of nog niet berekend); `check` met koppeling en `formatIssuesOpen === 0`
  - `formatStateFromMailing(m): { values: Record<string, string>; excluded: Record<number, true> }`
  - `useMailingSaver(initial: Mailing): { mailing: Mailing; save(change: MailingChange, event: string): Promise<void>; saveSoon(change: MailingChange, event: string): void; state: 'saved' | 'saving' | 'error' | 'conflict'; retry(): void; flush(): Promise<void> }` — `saveSoon` bewaart 2 s na de laatste oproep; `flush` bewaart meteen wat nog wacht
  - `MailingFlow` props: `{ mailing: Mailing; list: LoadedList; fileBytes: ArrayBuffer; docsUrl?: string; aiModel?: string; saver: ReturnType<typeof useMailingSaver> }`
  - `FormatStep` extra props: `initial?: { values: Record<string, string>; excluded: Record<number, true> }`, `onChange?: (s: { values: Record<string, string>; excluded: Record<number, true> }) => void`

- [ ] **Step 1: Write the failing test**

```ts
// tests/components/mailing-flow/resume.test.ts
import { describe, it, expect } from 'vitest'
import { formatStateFromMailing, resumeStep } from '@/components/mailing-flow/resume'
import { sampleMailing } from '../../core/masspost/store/mailing.test'

const mapping = { order: ['Naam'], roles: { Naam: 'name' } }

describe('resumeStep', () => {
  it('goes to mapping when nothing is mapped yet', () => {
    expect(resumeStep(sampleMailing({ status: 'uploaded', mapping: null }))).toBe('mapping')
  })
  it('goes to format when mapped and errors are open or not counted yet', () => {
    expect(resumeStep(sampleMailing({ status: 'mapped', mapping, counts: { addresses: 10, formatIssuesOpen: null } }))).toBe('format')
    expect(resumeStep(sampleMailing({ status: 'format', mapping, counts: { addresses: 10, formatIssuesOpen: 3 } }))).toBe('format')
  })
  it('goes to the address check when the format is in order', () => {
    expect(resumeStep(sampleMailing({ status: 'format', mapping, counts: { addresses: 10, formatIssuesOpen: 0 } }))).toBe('check')
  })
})

describe('formatStateFromMailing', () => {
  it('turns stored corrections and exclusions into the format step state', () => {
    const m = sampleMailing({ corrections: { '12:name': 'Jan' }, excludedRows: [14, 20] })
    expect(formatStateFromMailing(m)).toEqual({ values: { '12:name': 'Jan' }, excluded: { 14: true, 20: true } })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/mailing-flow/resume.test.ts`
Expected: FAIL — module ontbreekt.

- [ ] **Step 3: Implement `resume.ts`**

```ts
// src/components/mailing-flow/resume.ts
import type { Mailing } from '@/core/masspost/store/mailing'
import type { StepId } from './StepBar'

/**
 * The furthest step with a valid result (decision 52 of 02/10). Step 1 is never resumed: the
 * mailing exists, so its file was read.
 * @param m The stored mailing.
 * @returns The step to open.
 */
export function resumeStep(m: Mailing): StepId {
  if (!m.mapping) return 'mapping'
  if (m.counts.formatIssuesOpen === 0) return 'check'
  return 'format'
}

/**
 * The corrections and exclusions as the format step keeps them.
 * @param m The stored mailing.
 * @returns Values by `<seq>:<field>` and excluded rows by seq.
 */
export function formatStateFromMailing(m: Mailing): { values: Record<string, string>; excluded: Record<number, true> } {
  return { values: { ...m.corrections }, excluded: Object.fromEntries(m.excludedRows.map((seq) => [seq, true as const])) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/mailing-flow/resume.test.ts`
Expected: PASS.

- [ ] **Step 5: `FormatStep` gets initial state and reports changes**

In `FormatStep.tsx`:
- de `useReducer`-beginwaarde wordt `{ values: initial?.values ?? {}, excluded: initial?.excluded ?? {}, undo: [], nextId: 1 }`;
- nieuw effect na elke wijziging van `state.values` of `state.excluded`: `onChangeRef.current?.({ values: state.values, excluded: state.excluded })`, met het eerste renderen overgeslagen (`useRef(true)`), zodat het laden zelf geen bewaaractie start.

- [ ] **Step 6: `useMailingSaver`**

```ts
// src/components/mailing-flow/useMailingSaver.ts
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Mailing } from '@/core/masspost/store/mailing'
import { RevisionConflictError, type MailingChange } from '@/core/masspost/store/mailing-store'
import { useMailingStore } from '@/components/mailings/MailingStoreProvider'

/** Saves a mailing: right away, or 2 s after the last change (format step). */
export function useMailingSaver(initial: Mailing) {
  const { store, user } = useMailingStore()
  const [mailing, setMailing] = useState(initial)
  const [state, setState] = useState<'saved' | 'saving' | 'error' | 'conflict'>('saved')
  const current = useRef(initial)
  const pending = useRef<{ change: MailingChange; event: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const run = useCallback(
    async (change: MailingChange, event: string) => {
      setState('saving')
      try {
        const next = await store.update(current.current.id, change, current.current.revision, user.email, event)
        current.current = next
        setMailing(next)
        setState('saved')
      } catch (e) {
        pending.current = { change: { ...pending.current?.change, ...change }, event }
        setState(e instanceof RevisionConflictError ? 'conflict' : 'error')
      }
    },
    [store, user.email],
  )

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const p = pending.current
    if (!p) return
    pending.current = null
    await run(p.change, p.event)
  }, [run])

  const save = useCallback(
    async (change: MailingChange, event: string) => {
      clearTimeout(timer.current)
      const merged = { ...pending.current?.change, ...change }
      pending.current = null
      await run(merged, event)
    },
    [run],
  )

  const saveSoon = useCallback(
    (change: MailingChange, event: string) => {
      pending.current = { change: { ...pending.current?.change, ...change }, event }
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), 2000)
    },
    [flush],
  )

  // Leaving with something unsaved: ask first (SR-112 §6, "Bewaren mislukt").
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || state === 'error' || state === 'conflict') e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state])

  useEffect(() => () => void flush(), [flush])

  return { mailing, save, saveSoon, state, retry: flush, flush }
}
```

- [ ] **Step 7: `MailingFlow` works on a mailing**

In `MailingFlow.tsx`:
- props uit "Interfaces"; `list` en `fileBytes` komen binnen in plaats van uit `UploadStep` (die stap verdwijnt uit de flow: `step` start op `resumeStep(mailing)`);
- `roles` en `columnOrder` starten uit `mailing.mapping` (`order`, `roles` als `Record<string, ColumnRole>`), en anders uit `suggestColumnMapping` + `initialRoles` zoals de oude `onLoaded`;
- zit de mailing in `format` of `check`, dan draait `check(list, roles, columnOrder)` bij het mounten, zodat `issues` er zijn; `FormatStep` krijgt `initial={formatStateFromMailing(mailing)}`;
- **bewaren:**
  - in `MappingStep.onNext`, vóór `check(...)`: `await saver.save({ mapping: { order: columnOrder, roles }, status: 'mapped' }, 'mapped')`;
  - na `check(...)`: `saver.save({ status: 'format', counts: { addresses: list.rows.length, formatIssuesOpen: found.length } }, 'format-checked')`;
  - `FormatStep.onChange` → `saver.saveSoon({ corrections: s.values, excludedRows: Object.keys(s.excluded).map(Number), counts: { addresses: list.rows.length, formatIssuesOpen: formatTotals.open } }, 'format-edited')`;
  - `onTotals` werkt `formatTotals` bij zoals nu;
- de stappenbalk: `upload` is `done` en bereikbaar; een klik erop gaat naar `?stap=gegevens` (via `onGo`).
- boven de flow een balk volgens `saver.state`:
  - `error`: "Nog niet bewaard · Opnieuw proberen" (knop roept `saver.retry`);
  - `conflict`: "Deze mailing is intussen gewijzigd · Herladen" (knop `location.reload()`);
  - `saving`/`saved`: niets.

- [ ] **Step 8: The page**

```tsx
// src/app/(app)/mailings/[code]/page.tsx
import { env } from '@/lib/config/env'
import { isProviderModel } from '@/lib/masspost/suggest-mapping-ai'
import { MailingPage } from '@/components/mailing-flow/MailingPage'

/** One mailing: its flow, or step 1 to change its details (`?stap=gegevens`). */
export default async function MailingRoute({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ stap?: string }>
}) {
  const { code } = await params
  const { stap } = await searchParams
  const model = env.MASSPOST_SUGGEST_MAPPING_MODEL?.trim()
  return (
    <MailingPage
      code={decodeURIComponent(code)}
      editDetails={stap === 'gegevens'}
      docsUrl={env.NEXT_PUBLIC_DOCS_URL}
      aiModel={isProviderModel(model) ? model : undefined}
    />
  )
}
```

`MailingPage.tsx` (client):
1. `store.findByCode(code)`:
   - `null` → "Deze mailing bestaat niet (meer)." met een link naar Mailings;
   - `UnreadableMailingError` → "Kan deze mailing niet lezen.";
   - `StoreUnavailableError` → de melding uit Global Constraints.
2. Bij `editDetails`: `<ImportStep mode={{ mode: 'edit', mailing }} …/>` (defaults zijn niet nodig: alle velden komen uit de mailing).
3. Anders: `store.getSourceFile(id)` → `arrayBuffer()` → `parseExcelAddresses(bytes)` (dynamische import van `@/core/masspost/excel`, met de wachtcirkel en `nextPaint` zoals `UploadStep`) → `LoadedList` (`fileName: mailing.source.name`) → `<MailingFlow mailing list fileBytes saver …/>`.
4. Kopregel: `PageHeader` met de titel, daarachter de code (klein, `font-family: var(--font-geist-mono)`), en een menu "…" met **Gegevens aanpassen** (link `?stap=gegevens`) en **Archiveren** (`store.archive`, daarna naar `/mailings` met de melding "… is gearchiveerd · Ongedaan maken").

- [ ] **Step 9: Verify in the preview**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: alle tests PASS.

In de preview, met een voorbeeld-Excel uit `docs/samples/`:
1. Maak een mailing (stap 1) → stap 2 Koppelen; herlaad → weer stap 2.
2. Koppel en klik Verder → formaatvalidatie; lijst toont "Formaatvalidatie · N open".
3. Corrigeer twee fouten, sluit één rij uit, wacht 3 s, herlaad → beide correcties en de uitsluiting staan er nog.
4. Los alles op → stap 4 (export); herlaad → stap 4; de AFT-export downloadt.
5. Open dezelfde mailing in een tweede tabblad, wijzig in tab 1, wijzig in tab 2 → tab 2 toont "Deze mailing is intussen gewijzigd · Herladen".
6. "Gegevens aanpassen" → titel wijzigen → Bewaren → de lijst toont de nieuwe titel.
7. Archiveer via "…" → de mailing staat in het Archief; Terugzetten zet ze terug.

Neem screenshots van stap 1, de lijst en de formaatvalidatie, in licht en donker.

- [ ] **Step 10: Checkpoint** — niet committen.

---

### Task 11: Opruimen, documentatie en afronden

**Files:**
- Delete: `src/app/(tools)/` (hele routegroep), `src/app/dashboard/` (met `TokenRow.tsx`, `actions.ts`), `tests/app/dashboard/`, `tests/app/masspost/poc/` (leeg na taak 5)
- Modify: `src/app/globals.css` (de `bp-dashboard-*`-regels weg als niets ze nog gebruikt: `grep -rn "bp-dashboard" src`), `src/app/install/page.tsx` (links naar `/dashboard`)
- Modify: `docs/documentatie/webapp/` (`dashboard.md` → `instellingen.md`, nieuwe `mailings.md`, `adreslijst-nakijken.md` en `inloggen.md` bijwerken), `docs/documentatie/SUMMARY.md`, `docs/SUMMARY.md`, `docs/ontwikkelaars/website.md`
- Modify: `CHANGELOG.md`, `.agent/plans/2026-10-12-sr-112-v1-design.md` (status), `.agent/plans/2026-10-11-sr-112-webapp-shell-design.md` (verwijzing naar v1), `.agent/plans/INDEX.md`

- [ ] **Step 1: Remove the old pages**

```bash
git rm -r "src/app/(tools)" src/app/dashboard tests/app/dashboard
```

Run: `grep -rn "/dashboard\|masspost/poc\|PocFlow\|build:poc" src tests scripts docs/documentatie docs/ontwikkelaars --include=*.ts --include=*.tsx --include=*.md | grep -v "ontwikkelaars/library"`
Expected: enkel nog de plekken uit stap 2 hieronder.

- [ ] **Step 2: `/install`**

`src/app/install/page.tsx` regels 114 en 138: de links naar `/dashboard` gaan naar de landingspagina `/` (Mark, 12/10). Regel 106 (een token genereren "in je dashboard") wordt geschrapt: die mogelijkheid bestaat niet meer in de interface.

- [ ] **Step 3: Documentation**

- `docs/documentatie/webapp/instellingen.md` (vervangt `dashboard.md`): wat elk van de vier blokken doet, Vlaams, voor de klant; de plaatshouders als "komt later".
- `docs/documentatie/webapp/mailings.md`: de lijst, zoeken, sorteren, archiveren, een nieuwe mailing en hervatten; vermeld dat mailings voorlopig enkel in de browser staan.
- Werk `adreslijst-nakijken.md` en `inloggen.md` bij (geen "proefversie" of `/masspost/poc` meer).
- Beide pagina's in `docs/documentatie/SUMMARY.md` en `docs/SUMMARY.md` (met mappad), `dashboard.md` eruit.
- `docs/ontwikkelaars/website.md`: routes, `src/components/…`, de store en `IndexedDbMailingStore`.
- Geen verwijzingen van `docs/documentatie/` naar `docs/ontwikkelaars/`.

- [ ] **Step 4: Changelog and plans**

`CHANGELOG.md` onder `## [Unreleased]`, één samenhangend item per groep:
- **Nieuw / Added:** de webapp met zijbalk, mailinglijst, Archief, Deposits (plaatshouder), Instellingen, een nieuwe stap 1 en de flow per mailing, bewaard in de browser; de library-store (`src/core/masspost/store/`); de migratie `tenant_preferences`.
- **Aanpassingen / Changed:** de POC-flow is de flow van een mailing; de MCP-login stuurt naar `/instellingen`.
- **Removed:** `/masspost/poc`, `/dashboard`, de oude home, `npm run build:poc`, het meetpaneel en de demo-lijst; de MCP-tokens uit de interface (ze blijven werken).

Zet de status in `2026-10-12-sr-112-v1-design.md` en in `INDEX.md` op 🔄 "gebouwd, wacht op review".

- [ ] **Step 5: Definition of Done**

Run:
```bash
npm run lint:fix
npx tsc --noEmit
npm test
npm run docs:check
npm run check:hardcoded
```
Expected: alles groen. `docs:check` faalt als `docs/ontwikkelaars/library/` of `openapi.yaml` achterloopt: draai dan `npm run docs:build` en herhaal.

- [ ] **Step 6: Final check in the preview** — herhaal de zeven stappen van taak 10, stap 9, plus: `/` zonder login, Instellingen bewaren, de zijbalk op 1000 px, het menu met het toetsenbord.

- [ ] **Step 7: Commit (één keer, met akkoord van Mark)**

```bash
git add -A
git status
git commit -m "feat: webapp met zijbalk, mailinglijst en flow per mailing (SR-112 v1)"
```

Zet daarna SR-112 op **In review** (Linear), niet sluiten.

---

## Besloten en open punten

- **MCP-login en `/install` (Mark, 12/10):** wie via `/oauth/authorize` zonder bpost-gegevens binnenkomt, of op `/install` een link volgt, gaat naar de landingspagina `/`. De app-tokens verdwijnen uit de interface (SR-112 besluit 13); bestaande tokens blijven werken. Taak 8 stap 6 en taak 11 stap 2.
- **Open:** **`npm run db:push`** (taak 4) raakt de gedeelde Neon-database: enkel met akkoord van Mark.

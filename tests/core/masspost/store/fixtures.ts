import type { Mailing } from '@/core/masspost/store/mailing'

/** A complete, valid mailing for tests. */
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

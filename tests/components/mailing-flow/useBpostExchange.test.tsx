// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Blob as NodeBlob } from 'node:buffer'
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { MappedField, MappedRow } from '@/core/masspost/mapping'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import { MAILING_FILES_DIR, StoreFullError } from '@/core/masspost/store/mailing-store'
import type { Exchange, Mailing } from '@/core/masspost/store/mailing'
import { MailingStoreContext, STORE_FULL_MESSAGE } from '@/components/mailings/MailingStoreProvider'
import { useBpostExchange } from '@/components/mailing-flow/useBpostExchange'
import { useMailingSaver } from '@/components/mailing-flow/useMailingSaver'
import { saveFile } from '@/components/mailing-flow/save-file'
import { newInput } from '../../core/masspost/store/mailing-store-contract'

vi.mock('@/components/mailing-flow/save-file', () => ({ saveFile: vi.fn() }))

// jsdom's Blob has no arrayBuffer(); Node's has.
globalThis.Blob = NodeBlob as unknown as typeof Blob

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.mocked(saveFile).mockClear()
})

const CHECK_RS = readFileSync(
  path.join(process.cwd(), 'docs/samples/contrapunt/bpost-roundtrip/MID_0200_251614_REFERENCE0_261001152310_2RS.XML'),
)
const REQUEST = 'MID_0200_251614_REFERENCE0_261001151829_0RQ.XML' // answered by CHECK_RS
const f = (value: string): MappedField => ({ value, truncated: false, originalLength: value.length, replacedChars: [], unsupportedChars: [] })
// Row 1 as in the Excel, before the correction of step 3 (the answer echoes "Molenbeeksestraat 184 35").
// As mapRows gives it: a block without a column is undefined.
const rows: MappedRow[] = [{ seq: 1, source: {}, fields: { name: f('Anna Vanderstappen'), companyDepartment: undefined, streetHouseBox: f('Molenbeeksestraat  184 35'), postcodeCity: f('1020 Brussel') } }]
const corrections = { values: { '1:streetHouseBox': 'Molenbeeksestraat 184 35' }, excluded: {}, undo: [], nextId: 1 }
const ids = { customerId: '251614', accountId: '1234567' }
const sent = (over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName: REQUEST,
  mailingRef: 'CP-2026-1-C1',
  mode: 'T',
  items: 5,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@x.be',
  state: 'sent',
  ...over,
})

async function setup(exchanges: Exchange[], files: Record<string, Buffer> = {}) {
  const store = new MemoryMailingStore()
  const created = await store.create(newInput(), new Blob([]), 'an@x.be')
  for (const [name, bytes] of Object.entries(files)) await store.saveFile(created.id, MAILING_FILES_DIR + name, new Blob([new Uint8Array(bytes)]))
  const mailing = await store.update(created.id, { status: 'format', exchanges }, created.revision, 'an@x.be', 'test')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MailingStoreContext.Provider value={{ store, user: { email: 'an@x.be' } }}>{children}</MailingStoreContext.Provider>
  )
  const hook = renderHook(
    ({ m }: { m: Mailing }) => {
      const saver = useMailingSaver(m)
      return useBpostExchange({ saver, rows, corrections, bpost: ids })
    },
    { wrapper, initialProps: { m: mailing } },
  )
  return { store, mailing, hook }
}

describe('useBpostExchange (review 14/10)', () => {
  it('gives the rows their uncorrected values, so a change in step 4 keeps the corrections of step 3 (finding 1)', async () => {
    const { hook } = await setup([sent({ state: 'processed', responseFile: 'A_2RS.XML', statusCode: '100', arr: 100 })], { 'A_2RS.XML': CHECK_RS })
    await waitFor(() => expect(hook.result.current.check).not.toBeNull())
    const row = hook.result.current.check!.view.rows.find((r) => r.seq === 1)!
    expect(row.base?.streetHouseBox).toBe('Molenbeeksestraat  184 35')
  })

  it('keeps showing the last processed check after a refused one (finding 4)', async () => {
    const { hook } = await setup(
      [
        sent({ state: 'processed', responseFile: 'A_2RS.XML', statusCode: '100', arr: 100 }),
        sent({ fileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML', mailingRef: 'CP-2026-1-C2', state: 'rejected', problem: 'MID-2040' }),
      ],
      { 'A_2RS.XML': CHECK_RS },
    )
    await waitFor(() => expect(hook.result.current.check?.result.arr).toBe(100))
  })

  it('processes the same answer once when it is dropped twice at the same time (finding 5)', async () => {
    const { store, mailing, hook } = await setup([sent()])
    // A dropped file: a Blob with a name (jsdom's File has no arrayBuffer()).
    const file = () => Object.assign(new NodeBlob([new Uint8Array(CHECK_RS)]), { name: 'MID_0200_251614_REFERENCE0_261001152310_2RS.XML' }) as unknown as File
    await act(async () => {
      await Promise.all([hook.result.current.receive([file()]), hook.result.current.receive([file()])])
    })
    const stored = await store.get(mailing.id)
    expect(stored?.log.filter((l) => l.event === 'bpost-check')).toHaveLength(1)
    expect(stored?.status).toBe('checked')
  })

  it('puts the file in the outbox without downloading it', async () => {
    const { hook } = await setup([])
    await act(async () => {
      await hook.result.current.send('check', 'T')
    })
    expect(saveFile).not.toHaveBeenCalled()
    await waitFor(() => expect(hook.result.current.outgoingUrl).toMatch(/^blob:/))
  })

  it('says the storage is full, and saves no file for e-MassPost, when sending cannot be stored (finding 6)', async () => {
    const { store, hook } = await setup([])
    vi.spyOn(store, 'saveFile').mockRejectedValueOnce(new StoreFullError(new Error('quota')))
    await act(async () => {
      await hook.result.current.send('check', 'T')
    })
    expect(hook.result.current.message).toBe(STORE_FULL_MESSAGE)
    expect(saveFile).not.toHaveBeenCalled()
  })
})

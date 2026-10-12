// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { IndexedDbMailingStore } from '@/core/masspost/store/indexeddb-store'
import { mailingDatabaseName, MailingStoreProvider } from '@/components/mailings/MailingStoreProvider'
import { MailingPage } from '@/components/mailing-flow/MailingPage'
import { newInput } from '../../core/masspost/store/mailing-store-contract'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/mailings/CP-2026-1',
}))

vi.mock('@/components/app-shell/actions', () => ({ signOutAction: vi.fn() }))

// jsdom's Blob has no arrayBuffer(); the browser's and Node's have.
globalThis.Blob = NodeBlob as unknown as typeof Blob

afterEach(cleanup)

async function seed(tenantId: string) {
  const store = new IndexedDbMailingStore({ name: mailingDatabaseName(tenantId) })
  const bytes = xlsxBuffer([
    ['Naam', 'Straat', 'Postcode'],
    ['An Peeters', 'Kerkstraat 4', '9340 Lede'],
  ])
  await store.create(newInput('CP-2026-1'), new Blob([new Uint8Array(bytes)]), 'an@x.be')
}

describe('MailingPage', () => {
  it('goes from "Gegevens aanpassen" back to the flow without crashing (same page, other search params)', async () => {
    await seed('t-switch')
    const tree = (editDetails: boolean) => (
      <MailingStoreProvider user={{ email: 'an@x.be' }} tenantId="t-switch">
        <MailingPage code="CP-2026-1" editDetails={editDetails} />
      </MailingStoreProvider>
    )
    const { rerender } = render(tree(true))
    await screen.findByRole('heading', { name: 'Gegevens aanpassen' })
    rerender(tree(false))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Gegevens aanpassen' })).toBeNull())
  })

  it('keeps the mailings of one tenant out of another tenant on the same browser', async () => {
    await seed('t-a')
    render(
      <MailingStoreProvider user={{ email: 'bo@y.be' }} tenantId="t-b">
        <MailingPage code="CP-2026-1" editDetails={false} />
      </MailingStoreProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Deze mailing bestaat niet (meer)' })).toBeTruthy()
  })
})

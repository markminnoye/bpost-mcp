// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { Blob as NodeBlob } from 'node:buffer'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  it('opens on step 1 with ?stap=gegevens, and the step bar goes on to Koppelen', async () => {
    await seed('t-switch')
    render(
      <MailingStoreProvider user={{ email: 'an@x.be' }} tenantId="t-switch">
        <MailingPage code="CP-2026-1" editDetails />
      </MailingStoreProvider>,
    )
    await screen.findByRole('region', { name: 'Importeren' })
    fireEvent.click(screen.getByRole('button', { name: /2\. Koppelen/ }))
    expect(await screen.findByRole('region', { name: 'Kolommen koppelen' })).toBeTruthy()
  })

  it('takes the bpost numbers of the tenant and renders the flow as before', async () => {
    await seed('t-bpost')
    render(
      <MailingStoreProvider user={{ email: 'an@x.be' }} tenantId="t-bpost">
        <MailingPage code="CP-2026-1" editDetails bpost={{ customerId: '251614', accountId: '1234567' }} />
      </MailingStoreProvider>,
    )
    await screen.findByRole('region', { name: 'Importeren' })
    fireEvent.click(screen.getByRole('button', { name: /2\. Koppelen/ }))
    expect(await screen.findByRole('region', { name: 'Kolommen koppelen' })).toBeTruthy()
  })

  it('keeps the other steps out of reach while a required field of step 1 is empty', async () => {
    await seed('t-empty')
    render(
      <MailingStoreProvider user={{ email: 'an@x.be' }} tenantId="t-empty">
        <MailingPage code="CP-2026-1" editDetails />
      </MailingStoreProvider>,
    )
    const title = await screen.findByRole('textbox', { name: /Titel/ })
    fireEvent.change(title, { target: { value: '' } })
    expect(await screen.findByText('Vul een titel in.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /2\. Koppelen/ })).toBeNull()
    expect((screen.getByRole('button', { name: 'Verder naar koppelen' }) as HTMLButtonElement).disabled).toBe(true)
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

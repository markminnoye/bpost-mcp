// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { File as NodeFile } from 'node:buffer'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { xlsxBuffer } from '@/core/masspost/fixtures/xlsx'
import { MailingStoreProvider } from '@/components/mailings/MailingStoreProvider'
import { ImportStep } from '@/components/mailing-flow/ImportStep'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/mailings/nieuw',
}))

vi.mock('@/components/app-shell/actions', () => ({ signOutAction: vi.fn() }))

afterEach(cleanup)

const defaults = { format: 'Small', priority: 'NP', genMID: '7', genPSC: 'N', mode: 'P', codePrefix: 'CP' } as const

describe('ImportStep (new mailing)', () => {
  it('first shows only the address list; once read, the details appear with the title from the file name', async () => {
    render(
      <MailingStoreProvider user={{ email: 'an@x.be' }} tenantId="t-import">
        <ImportStep defaults={defaults} />
      </MailingStoreProvider>,
    )
    expect(screen.getByText('Sleep je adreslijst hierheen')).toBeTruthy()
    expect(screen.queryByLabelText(/Titel/)).toBeNull()

    const bytes = xlsxBuffer([
      ['Naam', 'Straat', 'Postcode'],
      ['An Peeters', 'Kerkstraat 4', '9340 Lede'],
    ])
    const file = new NodeFile([new Uint8Array(bytes)], 'Nieuwsbrief december.xlsx') as unknown as File
    fireEvent.change(screen.getByLabelText('Excel-bestand kiezen'), { target: { files: [file] } })

    const title = (await screen.findByRole('textbox', { name: /Titel/ })) as HTMLInputElement
    expect(title.value).toBe('Nieuwsbrief december')
    await waitFor(() => expect(document.activeElement?.id).toBe('f-date'))
  })
})

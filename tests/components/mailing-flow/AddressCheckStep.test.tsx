// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AddressCheckStep } from '@/components/mailing-flow/AddressCheckStep'
import type { BpostExchange } from '@/components/mailing-flow/useBpostExchange'
import { MailingStoreContext } from '@/components/mailings/MailingStoreProvider'
import type { Exchange } from '@/core/masspost/store/mailing'
import { MemoryMailingStore } from '@/core/masspost/store/memory-store'
import { sampleMailing } from '../../core/masspost/store/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/mailing-flow/exports', () => ({
  savePrinterFileForMailing: vi.fn(async () => {}),
}))
afterEach(cleanup)

function withStore(ui: ReactNode) {
  return (
    <MailingStoreContext.Provider value={{ store: new MemoryMailingStore(), user: { email: 'an@x.be' } }}>
      {ui}
    </MailingStoreContext.Provider>
  )
}

const exchange = (over: Partial<BpostExchange> = {}): BpostExchange => ({
  send: vi.fn(async () => {}),
  resend: vi.fn(async () => {}),
  outgoingUrl: null,
  receive: vi.fn(async () => {}),
  check: null,
  create: null,
  changed: false,
  busy: false,
  message: null,
  ...over,
})
const corrections = { values: {}, excluded: {}, undo: [], nextId: 1 }
const ids = { customerId: '251614', accountId: '1234567' }
const base = { corrections, dispatch: () => {}, active: true, bpost: ids }
const sent = (over: Partial<Exchange> = {}): Exchange => ({
  kind: 'check',
  fileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
  mailingRef: 'CP-2026-15-C1',
  mode: 'T',
  items: 789,
  fingerprint: 'cd'.repeat(32),
  excluded: [],
  sentAt: '2026-10-13T12:05:00.000Z',
  sentBy: 'an@x.be',
  state: 'sent',
  ...over,
})

describe('AddressCheckStep (sketch v4.6)', () => {
  it('not checked yet: explains, an empty outbox and an inbox, and "Controleren bij e-MassPost" sends a check in T', () => {
    const ex = exchange()
    render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'format', counts: { addresses: 789, formatIssuesOpen: 0 } })} exchange={ex} />)
    expect(screen.getByText(/Klik op Controleren bij e-MassPost/)).toBeTruthy()
    const outbox = screen.getByRole('region', { name: /Uitgaand/ })
    expect(outbox.textContent).toContain('Uitgaand · naar e-MassPost')
    expect(outbox.textContent).toContain('Laad dit bestand op via e-MassPost.')
    expect(outbox.textContent).not.toContain('Download hier')
    expect(outbox.textContent).not.toContain('Sleep hierheen')
    const portals = screen.getAllByRole('link', { name: 'e-MassPost' })
    expect(portals.length).toBeGreaterThanOrEqual(2)
    for (const portal of portals) {
      expect(portal.getAttribute('href')).toBe(
        'https://osp.bpost.be/Masspost-Webcounter/jsp/userManagementAction.do?action=authenticateUser',
      )
      expect(portal.getAttribute('target')).toBe('_blank')
    }
    const inbox = screen.getByRole('region', { name: /Inkomend/ })
    expect(inbox.textContent).toContain('Inkomend · van e-MassPost')
    expect(inbox.textContent).toContain('Zet hier wat e-MassPost terugstuurt')
    expect(inbox.textContent).toContain('Sleep hierheen of klik om te kiezen')
    expect(inbox.textContent).not.toContain('Upload hier')
    expect(inbox.textContent).not.toContain('Ontvangstbewijs')
    fireEvent.click(screen.getByRole('button', { name: /Controleren bij e-MassPost/ }))
    expect(ex.send).toHaveBeenCalledWith('check', 'T')
  })

  it('waiting: the button is off, the request is in the outbox and can be saved again', () => {
    const ex = exchange()
    const mailing = sampleMailing({ status: 'format', counts: { addresses: 789, formatIssuesOpen: 0 }, exchanges: [sent()] })
    render(<AddressCheckStep {...base} mailing={mailing} exchange={ex} />)
    expect((screen.getByRole('button', { name: /Wachten op e-MassPost/ }) as HTMLButtonElement).disabled).toBe(true)
    const outbox = screen.getByRole('region', { name: /Uitgaand/ })
    expect(outbox.textContent).toContain('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')
    expect(
      screen.getByText((_, el) => !!el && el.textContent === 'Zolang er geen automatische verbinding met e-MassPost is, breng je deze bestanden zelf over via het portaal. Later gaat dat automatisch.'),
    ).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'e-MassPost' }).length).toBeGreaterThanOrEqual(2)
    fireEvent.click(screen.getByRole('button', { name: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML' }))
    expect(ex.resend).toHaveBeenCalledTimes(1)
  })

  it('saves the outgoing file from a link, and a drag of that file carries it for the Finder', () => {
    const url = 'blob:http://localhost/out'
    const mailing = sampleMailing({ status: 'format', exchanges: [sent()] })
    render(<AddressCheckStep {...base} mailing={mailing} exchange={exchange({ outgoingUrl: url })} />)
    const file = screen.getByRole('link', { name: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML' }) as HTMLAnchorElement
    expect(file.getAttribute('href')).toBe(url)
    expect(file.getAttribute('download')).toBe('MID_0200_251614_REFERENCE0_261013140500_0RQ.XML')
    const setData = vi.fn()
    fireEvent.dragStart(file, { dataTransfer: { setData, effectAllowed: 'uninitialized' } })
    expect(setData).toHaveBeenCalledWith(
      'DownloadURL',
      'application/xml:MID_0200_251614_REFERENCE0_261013140500_0RQ.XML:blob:http://localhost/out',
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const zone = screen.getByRole('region', { name: /Uitgaand/ }).querySelector('[data-download]')
    fireEvent.click(zone!)
    expect(click).toHaveBeenCalled()
    click.mockRestore()
  })

  it('lists an uploaded acknowledgement, and the answer once that file is in', () => {
    const ack = sampleMailing({ status: 'format', exchanges: [sent({ state: 'received', receivedAt: '2026-10-13T14:07:00' })] })
    const { unmount } = render(<AddressCheckStep {...base} mailing={ack} exchange={exchange()} />)
    expect(screen.getByText('Ontvangstbewijs')).toBeTruthy()
    expect(screen.getByText('13 okt 14:07')).toBeTruthy()
    expect(screen.getByText('Ontvangen')).toBeTruthy()
    expect(screen.queryByText('A_2RS.XML')).toBeNull()
    expect(screen.queryByText(/Sleep hierheen of klik om te kiezen/)).toBeNull()
    unmount()
    const answered = sampleMailing({
      status: 'format',
      exchanges: [sent({ state: 'processed', receivedAt: '2026-10-13T14:07:00', responseFile: 'A_2RS.XML' })],
    })
    render(<AddressCheckStep {...base} mailing={answered} exchange={exchange()} />)
    expect(screen.getByText('Ontvangstbewijs')).toBeTruthy()
    expect(screen.getByText('A_2RS.XML')).toBeTruthy()
    expect(screen.queryByText(/Sleep hierheen of klik om te kiezen/)).toBeNull()
  })

  it('takes a dropped answer', () => {
    const ex = exchange()
    render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'format', exchanges: [sent()] })} exchange={ex} />)
    const file = new File(['<x/>'], 'A_2RS.XML')
    fireEvent.drop(screen.getByRole('button', { name: /Inkomend/ }), { dataTransfer: { files: [file] } })
    expect(ex.receive).toHaveBeenCalledWith([file])
  })

  it('without the numbers of e-MassPost: points to Instellingen, and the button is off', () => {
    render(<AddressCheckStep {...base} bpost={null} mailing={sampleMailing({ status: 'format' })} exchange={exchange()} />)
    expect(screen.getByText(/Vul eerst je klantnummer en account-ID in bij/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Instellingen' }).getAttribute('href')).toBe('/instellingen')
    expect((screen.getByRole('button', { name: /Controleren bij e-MassPost/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a refusal with its code', () => {
    const mailing = sampleMailing({ status: 'format', exchanges: [sent({ state: 'rejected', problem: 'MID-2040' })] })
    render(<AddressCheckStep {...base} mailing={mailing} exchange={exchange()} />)
    expect(screen.getByRole('alert').textContent).toBe(
      'e-MassPost weigerde het bestand. Het bestand bevat een fout in de opbouw (MID-2040). Kijk de lijst na en controleer opnieuw.',
    )
    expect(screen.getByRole('button', { name: /Controleren bij e-MassPost/ })).toBeTruthy()
  })

  it('shows the message of the exchange', () => {
    const message = 'Dit is geen antwoord van e-MassPost. Kies het XML-bestand dat eindigt op _2RS of _1AK.'
    render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'format' })} exchange={exchange({ message })} />)
    expect(screen.getByRole('alert').textContent).toBe(message)
  })

  describe('the result', () => {
    const result = {
      kind: 'check' as const,
      requestFileName: 'MID_0200_251614_REFERENCE0_261013140500_0RQ.XML',
      mailingRef: 'CP-2026-15-C1',
      statusCode: '100',
      arr: 97.2,
      messages: [],
      items: [{ seq: 58, messages: [{ code: 'MID-4010', severity: 'ERROR', contents: {} }], suggestions: [], candidates: [], sent: { streetHouseBox: 'Kerkstraat 999', postcodeCity: '9340 Lede' } }],
    }
    const view = { rows: [{ key: '58:address', seq: 58, group: 'noAddress' as const, field: 'address' as const, sent: result.items[0].sent, original: 'Kerkstraat 999, 9340 Lede', options: [], codes: ['MID-4010'] }], counts: { noAddress: 1, multiple: 0, proposal: 0, note: 0, ok: 788 }, unknownCodes: [] }
    const checked = sampleMailing({ status: 'checked', arr: 97.2, exchanges: [sent({ state: 'processed', responseFile: 'A_2RS.XML', statusCode: '100', arr: 97.2 })] })

    it('shows the ARR card, the groups, and the buttons Opnieuw controleren and Indienen in the header', () => {
      const ex = exchange({ check: { result, view } })
      render(<AddressCheckStep {...base} mailing={checked} exchange={ex} />)
      expect(screen.getByRole('meter', { name: 'ARR van e-MassPost' })).toBeTruthy()
      expect(screen.getByRole('region', { name: 'Geen adres gevonden' })).toBeTruthy()
      expect(screen.queryByRole('region', { name: /Uitgaand/ })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: /Opnieuw controleren/ }))
      expect(ex.send).toHaveBeenCalledWith('check', 'T')
      const submit = screen.getByRole('button', { name: /Indienen bij e-MassPost/ }) as HTMLButtonElement
      expect(submit.disabled).toBe(false)
      fireEvent.click(submit)
      expect(ex.send).toHaveBeenCalledWith('create', 'P')
    })

    it('keeps Indienen off under 96 %, with an explanation', () => {
      const low = { ...result, arr: 93.4 }
      const ex = exchange({ check: { result: low, view } })
      render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'checked', arr: 93.4, exchanges: checked.exchanges })} exchange={ex} />)
      const submit = screen.getByRole('button', { name: /Indienen bij e-MassPost/ }) as HTMLButtonElement
      expect(submit.disabled).toBe(true)
      expect(submit.parentElement?.getAttribute('data-tip')).toMatch(/onder 96/)
    })

    it('submits in the mode of the mailing (Test)', () => {
      const ex = exchange({ check: { result, view } })
      render(<AddressCheckStep {...base} mailing={sampleMailing({ status: 'checked', arr: 97.2, mode: 'T', exchanges: checked.exchanges })} exchange={ex} />)
      fireEvent.click(screen.getByRole('button', { name: /Indienen bij e-MassPost/ }))
      expect(ex.send).toHaveBeenCalledWith('create', 'T')
    })

    it('keeps the result on screen after a refused check, with the refusal above it (review finding 4)', () => {
      const refused = sampleMailing({
        status: 'checked',
        arr: 97.2,
        exchanges: [sent({ state: 'processed', responseFile: 'A_2RS.XML', statusCode: '100', arr: 97.2 }), sent({ fileName: 'B_0RQ.XML', mailingRef: 'CP-2026-15-C2', state: 'rejected', problem: 'MID-2040' })],
      })
      render(<AddressCheckStep {...base} mailing={refused} exchange={exchange({ check: { result, view } })} />)
      expect(screen.getByRole('alert').textContent).toContain('MID-2040')
      expect(screen.getByRole('meter', { name: 'ARR van e-MassPost' })).toBeTruthy()
      expect(screen.getByRole('button', { name: /Opnieuw controleren/ })).toBeTruthy()
    })

    it('says when the list changed after sending, with a way to check again', () => {
      const ex = exchange({ check: { result, view }, changed: true })
      render(<AddressCheckStep {...base} mailing={checked} exchange={ex} />)
      expect(screen.getByText(/Je wijzigde de lijst na het versturen/)).toBeTruthy()
      fireEvent.click(screen.getAllByRole('button', { name: 'Opnieuw controleren' }).at(-1)!)
      expect(ex.send).toHaveBeenCalledWith('check', 'T')
    })

    it('after submission: shows Ingediend and the printer file, without Opnieuw controleren', () => {
      const mailing = sampleMailing({
        status: 'submitted',
        arr: 99.8,
        mode: 'T',
        exchanges: [
          sent({
            kind: 'create',
            mailingRef: 'CP-2026-15',
            mode: 'T',
            state: 'processed',
            responseFile: 'A_2RS.XML',
            statusCode: '100',
            arr: 99.8,
            items: 786,
            sentAt: '2026-10-13T12:20:00.000Z',
          }),
        ],
      })
      const create = {
        kind: 'create' as const,
        requestFileName: 'X_0RQ.XML',
        mailingRef: 'CP-2026-15',
        statusCode: '100',
        arr: 99.8,
        messages: [],
        items: Array.from({ length: 786 }, (_, i) => ({
          seq: i + 1,
          messages: [],
          suggestions: [],
          candidates: [],
          sent: {},
          midNum: `90002109818${String(i).padStart(3, '0')}`,
        })),
      }
      render(withStore(<AddressCheckStep {...base} mailing={mailing} exchange={exchange({ create })} />))
      expect(screen.getByRole('region', { name: 'Ingediend' }).textContent).toMatch(/Ingediend · Test/)
      expect(screen.getByRole('region', { name: 'Ingediend' }).textContent).toMatch(/786 Mail ID/)
      expect(screen.getByRole('button', { name: /Opslaan voor de drukker/ })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /Opnieuw controleren/ })).toBeNull()
      expect(screen.queryByRole('button', { name: /Indienen bij e-MassPost/ })).toBeNull()
    })
  })
})

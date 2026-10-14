import { describe, it, expect, vi } from 'vitest'
import { MAILBOX_KINDS, ManualMailbox } from '@/core/masspost/mailbox'

describe('ManualMailbox', () => {
  it('sends by downloading, and gives back what the user dropped until it is removed', async () => {
    const download = vi.fn()
    const box = new ManualMailbox(download)
    const request = { name: 'A_0RQ.XML', bytes: new Uint8Array([1]) }
    await box.send(request)
    expect(download).toHaveBeenCalledWith(request)
    expect(await box.responses()).toEqual([])
    box.receive({ name: 'A_2RS.XML', bytes: new Uint8Array([2]) })
    expect((await box.responses()).map((f) => f.name)).toEqual(['A_2RS.XML'])
    await box.remove('A_2RS.XML')
    expect(await box.responses()).toEqual([])
  })
})

describe('MAILBOX_KINDS', () => {
  it('has manual available and Google Drive coming', () => {
    expect(MAILBOX_KINDS.map((k) => [k.kind, k.available])).toEqual([['manual', true], ['drive', false]])
  })
})

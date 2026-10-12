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

import { describe, it, expect } from 'vitest'
import { readStoredPreference, writeStoredPreference } from '@/components/app-shell/useStoredPreference'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
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
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    } as unknown as Storage
    expect(readStoredPreference('theme', ['light', 'dark'] as const, 'light', broken)).toBe('light')
    expect(() => writeStoredPreference('theme', 'dark', broken)).not.toThrow()
  })
})

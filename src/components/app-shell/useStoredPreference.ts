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
export function readStoredPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  storage?: Storage,
): T {
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
 * @param allowed The allowed values (a constant per call site).
 * @param fallback Default.
 * @returns The value and a setter that also stores it.
 */
export function useStoredPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback)
  useEffect(() => {
    setValue(readStoredPreference(key, allowed, fallback))
    // `allowed` is a constant per call site, so it is left out of the dependencies.
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

'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { IndexedDbMailingStore } from '@/core/masspost/store/indexeddb-store'
import type { MailingStore } from '@/core/masspost/store/mailing-store'

export const MailingStoreContext = createContext<{ store: MailingStore; user: { email: string } } | null>(null)

/**
 * The browser database of a tenant. Each tenant gets its own, so a second account on the same
 * browser does not see the mailings (and addresses) of another organisation.
 * @param tenantId The tenant.
 * @returns The IndexedDB name.
 */
export function mailingDatabaseName(tenantId: string): string {
  return `bpost-e-masspost:${tenantId}`
}

/**
 * One mailing store per tab. v1: IndexedDB per tenant; mijlpaal 2 swaps in the Drive store here only.
 * @param props The signed-in user, the tenant and the page.
 */
export function MailingStoreProvider({
  user,
  tenantId,
  children,
}: {
  user: { email: string }
  tenantId: string
  children: ReactNode
}) {
  const store = useMemo(() => new IndexedDbMailingStore({ name: mailingDatabaseName(tenantId) }), [tenantId])
  const value = useMemo(() => ({ store, user }), [store, user])
  return <MailingStoreContext.Provider value={value}>{children}</MailingStoreContext.Provider>
}

/** The store and the user; only inside `MailingStoreProvider`. */
export function useMailingStore(): { store: MailingStore; user: { email: string } } {
  const ctx = useContext(MailingStoreContext)
  if (!ctx) throw new Error('useMailingStore outside MailingStoreProvider')
  return ctx
}

/** The message when the browser cannot store anything (SR-112 v1 spec §4). */
export const STORE_UNAVAILABLE_MESSAGE =
  'Je browser bewaart hier niets, mogelijk omdat dit een privévenster is. Open de app in een venster zonder privémodus.'

/** The message when the browser's storage is full: a write failed for lack of room. */
export const STORE_FULL_MESSAGE =
  'De opslag van je browser is vol. Maak ruimte vrij op je computer en probeer het opnieuw.'

'use server'
import { signOut, auth } from '@/lib/auth'

export async function handleSignOut() {
  await signOut({ redirectTo: '/api/auth/signin' })
}

import { z } from 'zod'
import { db } from '@/lib/db/client'
import { apiTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type ActionResult =
  | { ok: true; redirect: string }
  | { ok: false; code: 'AUTH_ERROR' | 'VALIDATION_ERROR' | 'TRANSIENT_ERROR'; error: string }

export async function revokeToken(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Ongeldige aanvraag.' }
  }

  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' }
  }

  const [token] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
    .limit(1)

  if (!token || token.tenantId !== tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Je sessie is verlopen. Meld je opnieuw aan.' }
  }

  try {
    await db.delete(apiTokens).where(eq(apiTokens.id, id))
  } catch {
    return { ok: false, code: 'TRANSIENT_ERROR', error: 'Sleutel verwijderen is mislukt. Probeer opnieuw.' }
  }

  return { ok: true, redirect: '/dashboard' }
}

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
    return { ok: false, code: 'VALIDATION_ERROR', error: 'Invalid request.' }
  }

  const session = await auth()
  const tenantId = (session?.user as any)?.tenantId
  if (!tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }
  }

  const [token] = await db
    .select()
    .from(apiTokens)
    .where(eq(apiTokens.id, id))
    .limit(1)

  if (!token || token.tenantId !== tenantId) {
    return { ok: false, code: 'AUTH_ERROR', error: 'Session expired. Please sign in again.' }
  }

  try {
    await db.delete(apiTokens).where(eq(apiTokens.id, id))
  } catch {
    return { ok: false, code: 'TRANSIENT_ERROR', error: 'Failed to delete token. Please try again.' }
  }

  return { ok: true, redirect: '/dashboard' }
}

'use server'
import { signOut, auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function handleSignOut() {
  await signOut({ redirectTo: '/api/auth/signin' })
}

import { z } from 'zod'
import { db } from '@/lib/db/client'
import { apiTokens, tenantPreferences } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const BARCODE_STRATEGIES = ['bpost-generates', 'customer-provides', 'mcp-generates'] as const
const BARCODE_LENGTHS = ['7', '9', '11'] as const

export async function savePreferences(formData: FormData): Promise<void> {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) {
    throw new Error('Je sessie is verlopen. Meld je opnieuw aan.')
  }

  const strategy = formData.get('barcodeStrategy') as string
  const length = formData.get('barcodeLength') as string

  if (!BARCODE_STRATEGIES.includes(strategy as any)) {
    throw new Error('Ongeldige barcodestrategie.')
  }
  if (!BARCODE_LENGTHS.includes(length as any)) {
    throw new Error('Ongeldige barcodelengte.')
  }

  try {
    const [existing] = await db
      .select()
      .from(tenantPreferences)
      .where(eq(tenantPreferences.tenantId, tenantId))
      .limit(1)

    if (existing) {
      await db
        .update(tenantPreferences)
        .set({
          barcodeStrategy: strategy,
          barcodeLength: length,
          updatedAt: new Date(),
        })
        .where(eq(tenantPreferences.tenantId, tenantId))
    } else {
      await db.insert(tenantPreferences).values({
        tenantId,
        barcodeStrategy: strategy,
        barcodeLength: length,
      })
    }
  } catch {
    throw new Error('Opslaan mislukt. Probeer opnieuw.')
  }

  redirect('/dashboard')
}

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

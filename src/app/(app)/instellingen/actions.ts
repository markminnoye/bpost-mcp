'use server'

import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/client'
import { bpostCredentials, tenantPreferences, tenants } from '@/lib/db/schema'
import { env } from '@/lib/config/env'
import { encrypt } from '@/lib/crypto'
import { bpostCredentialsSchema, defaultsSchema, organisationSchema } from '@/lib/tenant/settings-schema'

/**
 * Outcome of a settings form. `error` shows next to the button; `fields` holds a message per field,
 * shown under that field, and `values` what was typed, so the form keeps it.
 */
export type SettingsResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fields?: Record<string, string>; values?: Record<string, string> }
  | null

const CHECK_FIELDS = 'Nog niet bewaard: kijk de velden na.'

/** The typed values, without the password. */
function typed(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].filter(([key, v]) => key !== 'password' && typeof v === 'string') as [string, string][],
  )
}

/** One message per field that failed, from a fixed text per field. */
function fieldMessages(
  issues: readonly { path: readonly PropertyKey[] }[],
  messages: Record<string, string>,
): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0])
    fields[key] = messages[key] ?? 'Kies een geldige waarde.'
  }
  return fields
}

const EXPIRED = { ok: false as const, error: 'Je sessie is verlopen. Meld je opnieuw aan.' }
const SAVED = { ok: true as const, message: 'Bewaard.' }

async function currentTenantId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.tenantId ?? null
}

/**
 * Saves the name of the organisation.
 * @param _prev The previous result (useActionState).
 * @param formData The form.
 * @returns The outcome.
 */
export async function saveOrganisation(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const tenantId = await currentTenantId()
  if (!tenantId) return EXPIRED
  const parsed = organisationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: CHECK_FIELDS,
      fields: fieldMessages(parsed.error.issues, { name: 'Vul een naam in van maximaal 100 tekens.' }),
      values: typed(formData),
    }
  }
  await db.update(tenants).set({ name: parsed.data.name }).where(eq(tenants.id, tenantId))
  revalidatePath('/', 'layout')
  return SAVED
}

/**
 * Saves the defaults for a new mailing.
 * @param _prev The previous result (useActionState).
 * @param formData The form.
 * @returns The outcome.
 */
export async function saveDefaults(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const tenantId = await currentTenantId()
  if (!tenantId) return EXPIRED
  const parsed = defaultsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: CHECK_FIELDS,
      fields: fieldMessages(parsed.error.issues, { codePrefix: 'Enkel letters en cijfers, maximaal 8.' }),
      values: typed(formData),
    }
  }
  const d = parsed.data
  await db
    .insert(tenantPreferences)
    .values({
      tenantId,
      defaultFormat: d.format,
      defaultPriority: d.priority,
      defaultGenMid: d.genMID,
      defaultPresort: d.genPSC,
      defaultMode: d.mode,
      codePrefix: d.codePrefix || null,
    })
    .onConflictDoUpdate({
      target: tenantPreferences.tenantId,
      set: {
        defaultFormat: sql`excluded.default_format`,
        defaultPriority: sql`excluded.default_priority`,
        defaultGenMid: sql`excluded.default_gen_mid`,
        defaultPresort: sql`excluded.default_presort`,
        defaultMode: sql`excluded.default_mode`,
        codePrefix: sql`excluded.code_prefix`,
        updatedAt: new Date(),
      },
    })
  revalidatePath('/', 'layout')
  return SAVED
}

const BPOST_MESSAGES: Record<string, string> = {
  customerNumber: 'Gebruik 1 tot 8 cijfers.',
  accountId: 'Gebruik 1 tot 8 cijfers.',
  barcodeCustomerId: 'Gebruik precies 5 cijfers, of laat het leeg.',
  username: 'Vul je gebruikersnaam in.',
  password: 'Vul je bpost-wachtwoord in.',
}

/**
 * Saves the bpost login. An empty password keeps the stored one; a first save needs one.
 * @param _prev The previous result (useActionState).
 * @param formData The form.
 * @returns The outcome.
 */
export async function saveBpost(_prev: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const tenantId = await currentTenantId()
  if (!tenantId) return EXPIRED
  const parsed = bpostCredentialsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      ok: false,
      error: CHECK_FIELDS,
      fields: fieldMessages(parsed.error.issues, BPOST_MESSAGES),
      values: typed(formData),
    }
  }
  const { password, ...fields } = parsed.data
  const key = env.ENCRYPTION_KEY
  if (!key) return { ok: false, error: 'Bewaren lukt nu niet. Probeer het later opnieuw.' }

  // Same steps as saveCreds on the former dashboard: update when a row exists, insert otherwise.
  const [existing] = await db.select().from(bpostCredentials).where(eq(bpostCredentials.tenantId, tenantId)).limit(1)
  const secret = password ? encrypt(password, key) : null
  if (existing) {
    await db
      .update(bpostCredentials)
      .set({
        ...fields,
        ...(secret ? { passwordEncrypted: secret.ciphertext, passwordIv: secret.iv } : {}),
        updatedAt: new Date(),
      })
      .where(eq(bpostCredentials.tenantId, tenantId))
  } else {
    if (!secret) {
      return { ok: false, error: CHECK_FIELDS, fields: { password: BPOST_MESSAGES.password }, values: typed(formData) }
    }
    await db
      .insert(bpostCredentials)
      .values({ tenantId, ...fields, passwordEncrypted: secret.ciphertext, passwordIv: secret.iv })
  }
  // The page learns that a password is stored now, so the field is no longer required.
  revalidatePath('/instellingen')
  return SAVED
}

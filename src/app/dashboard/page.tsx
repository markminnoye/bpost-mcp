// src/app/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { handleSignOut, savePreferences } from './actions'
import { TokenRow } from './TokenRow'
import { db } from '@/lib/db/client'
import { tenants, bpostCredentials, apiTokens, tenantPreferences } from '@/lib/db/schema'
import { encrypt, hashToken } from '@/lib/crypto'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { CopyCodeBlock } from '@/components/customer/CopyCodeBlock'
import { AlphaServiceBanner } from '@/components/customer/AlphaServiceBanner'
import { env } from '@/lib/config/env'

const MCP_URL = `${env.NEXT_PUBLIC_BASE_URL}/api/mcp`

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/dashboard')
  }

  const params = await searchParams
  const newlyGeneratedToken = params.token ?? null

  const tenantId = session.user.tenantId
  if (!tenantId) {
    return (
      <main className="bp-shell bp-shell--narrow">
        <p className="bp-prose">
          Er is geen account gekoppeld aan je login. Neem contact op met support als dit blijft gebeuren.
        </p>
      </main>
    )
  }

  const [existingTenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1)

  const existingCreds = existingTenant
    ? await db
        .select()
        .from(bpostCredentials)
        .where(eq(bpostCredentials.tenantId, existingTenant.id))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null

  const tokens = existingTenant
    ? await db.select().from(apiTokens).where(eq(apiTokens.tenantId, existingTenant.id))
    : []

  const existingPrefs = existingTenant
    ? await db
        .select()
        .from(tenantPreferences)
        .where(eq(tenantPreferences.tenantId, existingTenant.id))
        .limit(1)
        .then((rows) => rows[0] ?? null)
    : null

  const currentStrategy = existingPrefs?.barcodeStrategy ?? 'bpost-generates'
  const currentLength = existingPrefs?.barcodeLength ?? '7'

  async function saveCreds(formData: FormData) {
    'use server'
    const username = formData.get('username') as string
    const passwordRaw = (formData.get('password') as string) ?? ''
    const password = passwordRaw.trim()
    const customerNumber = formData.get('customerNumber') as string
    const accountId = formData.get('accountId') as string
    const prsNumber = (formData.get('prsNumber') as string) || null
    const barcodeCustomerId = (formData.get('barcodeCustomerId') as string) || null
    const encKey = process.env.ENCRYPTION_KEY!

    const session = await auth()
    const actionTenantId = session?.user?.tenantId
    if (!actionTenantId) throw new Error('Geen toegang.')

    const numericOnly = /^\d{1,8}$/
    if (!numericOnly.test(customerNumber)) throw new Error('Klantnummer: enkel 1 tot 8 cijfers.')
    if (!numericOnly.test(accountId)) throw new Error('Account-ID: enkel 1 tot 8 cijfers.')
    if (prsNumber && !numericOnly.test(prsNumber)) throw new Error('PRS-nummer: enkel 1 tot 8 cijfers.')
    if (barcodeCustomerId && !/^\d{5}$/.test(barcodeCustomerId)) throw new Error('Barcode-klant-ID: exact 5 cijfers.')

    const [existingCred] = await db
      .select()
      .from(bpostCredentials)
      .where(eq(bpostCredentials.tenantId, actionTenantId))
      .limit(1)

    if (existingCred) {
      const common = {
        username,
        customerNumber,
        accountId,
        prsNumber,
        barcodeCustomerId,
        updatedAt: new Date(),
      }
      if (password.length === 0) {
        await db
          .update(bpostCredentials)
          .set(common)
          .where(eq(bpostCredentials.tenantId, actionTenantId))
      } else {
        const { ciphertext, iv } = encrypt(password, encKey)
        await db
          .update(bpostCredentials)
          .set({
            ...common,
            passwordEncrypted: ciphertext,
            passwordIv: iv,
          })
          .where(eq(bpostCredentials.tenantId, actionTenantId))
      }
    } else {
      if (password.length === 0) {
        throw new Error('Voor nieuwe gegevens is een wachtwoord verplicht.')
      }
      const { ciphertext, iv } = encrypt(password, encKey)
      await db.insert(bpostCredentials).values({
        tenantId: actionTenantId,
        username,
        passwordEncrypted: ciphertext,
        passwordIv: iv,
        customerNumber,
        accountId,
        prsNumber,
        barcodeCustomerId,
      })
    }
    redirect('/dashboard')
  }

  async function generateToken(formData: FormData) {
    'use server'
    const label = (formData.get('label') as string) || 'thuis-computer'

    const session = await auth()
    const actionTenantId = session?.user?.tenantId
    if (!actionTenantId) redirect('/dashboard')

    const rawToken = `bpost_${randomBytes(32).toString('hex')}`
    const tokenHash = hashToken(rawToken)
    await db.insert(apiTokens).values({
      tenantId: actionTenantId,
      tokenHash,
      label,
    })
    redirect(`/dashboard?token=${encodeURIComponent(rawToken)}`)
  }

  return (
    <main className="bp-shell">
      <header className="bp-dashboard-header">
        <div className="bp-dashboard-header__titles">
          <h1 className="bp-page-title">Accountinstellingen</h1>
          <p className="bp-page-lead">
            Ingelogd als <strong style={{ color: 'var(--bp-text)' }}>{session.user.email}</strong>
          </p>
        </div>
        <form action={handleSignOut}>
          <button type="submit" className="bp-btn bp-btn--secondary">
            Afmelden
          </button>
        </form>
      </header>

      <AlphaServiceBanner />

      {newlyGeneratedToken && (
        <div className="bp-alert" role="status" style={{ marginBottom: '1.5rem' }}>
          <strong style={{ color: 'var(--bp-brand)' }}>
            Kopieer je app-token nu — je ziet hem daarna niet meer:
          </strong>
          <CopyCodeBlock code={newlyGeneratedToken} copyLabel="App-token kopiëren" />
        </div>
      )}

      <div className="bp-dashboard-stack">
        <section className="bp-card bp-card--section">
          <h2 className="bp-section-title">BPost-gegevens</h2>
          <p className="bp-prose">
            Dit zijn de gegevens waarmee deze dienst namens jou communiceert met BPost. Alleen voor dit
            account.
          </p>
          {existingCreds && (
            <p className="bp-prose" style={{ color: '#15803d', marginTop: '-0.35rem' }}>
              Er staat al een configuratie voor gebruiker <strong>{existingCreds.username}</strong>.
            </p>
          )}

          <form action={saveCreds} className="bp-form-grid">
            <label className="bp-label">
              Gebruikersnaam
              <input
                name="username"
                className="bp-input"
                defaultValue={existingCreds?.username ?? ''}
                required
              />
            </label>
            <label className="bp-label">
              Wachtwoord (BPost)
              <input
                name="password"
                className="bp-input"
                type="password"
                autoComplete="off"
                required={!existingCreds}
              />
            </label>
            {existingCreds ? (
              <p className="bp-muted-note" style={{ marginTop: '-0.35rem', marginBottom: '0.5rem' }}>
                Laat het wachtwoord leeg als je het niet wilt wijzigen. Vul wel iets in als je een nieuw
                wachtwoord wilt opslaan.
              </p>
            ) : null}
            <div className="bp-form-two-col">
              <label className="bp-label">
                Klantnummer
                <input
                  name="customerNumber"
                  className="bp-input"
                  defaultValue={existingCreds?.customerNumber ?? ''}
                  required
                  pattern="\d{1,8}"
                  maxLength={8}
                  title="1 tot 8 cijfers"
                />
              </label>
              <label className="bp-label">
                Account-ID
                <input
                  name="accountId"
                  className="bp-input"
                  defaultValue={existingCreds?.accountId ?? ''}
                  required
                  pattern="\d{1,8}"
                  maxLength={8}
                  title="1 tot 8 cijfers"
                />
              </label>
            </div>
            <label className="bp-label">
              PRS-nummer (optioneel)
              <input
                name="prsNumber"
                className="bp-input"
                defaultValue={existingCreds?.prsNumber ?? ''}
                pattern="\d{1,8}"
                maxLength={8}
                title="1 tot 8 cijfers"
              />
            </label>
            <label className="bp-label">
              Barcode-klant-ID (optioneel)
              <input
                name="barcodeCustomerId"
                className="bp-input"
                defaultValue={existingCreds?.barcodeCustomerId ?? ''}
                pattern="\d{5}"
                maxLength={5}
                title="Exact 5 cijfers"
              />
            </label>
            <p className="bp-muted-note" style={{ marginTop: '-0.35rem', marginBottom: '0.5rem' }}>
              Een 5-cijferige code die je van bpost ontvangt als je deelneemt aan het Mail ID-programma.
              Alleen nodig als je barcodes automatisch wilt laten aanmaken door deze dienst.
            </p>
            <button type="submit" className="bp-btn bp-btn--primary" style={{ marginTop: '0.25rem', width: 'fit-content' }}>
              Gegevens bewaren
            </button>
          </form>
        </section>

        <section className="bp-card bp-card--section">
          <h2 className="bp-section-title">Barcode-instellingen</h2>
          <p className="bp-prose">
            Kies hoe de barcodes voor je mailings worden aangemaakt.
          </p>

          <form action={savePreferences} className="bp-form-grid">
            <fieldset className="bp-radio-fieldset">
              <legend className="bp-label">Barcodestrategie</legend>
              <label className="bp-radio-label">
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="bpost-generates"
                  className="bp-radio"
                  defaultChecked={currentStrategy === 'bpost-generates'}
                />
                <span>bpost maakt de barcodes aan</span>
              </label>
              <label className="bp-radio-label">
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="customer-provides"
                  className="bp-radio"
                  defaultChecked={currentStrategy === 'customer-provides'}
                />
                <span>Ik lever zelf barcodes aan in mijn adresbestand</span>
              </label>
              <label className="bp-radio-label">
                <input
                  type="radio"
                  name="barcodeStrategy"
                  value="mcp-generates"
                  className="bp-radio"
                  defaultChecked={currentStrategy === 'mcp-generates'}
                />
                <span>Laat deze dienst de barcodes automatisch aanmaken</span>
              </label>
              {currentStrategy === 'mcp-generates' && !existingCreds?.barcodeCustomerId && (
                <p className="bp-muted-note" style={{ color: '#b45309', marginTop: '0.25rem' }}>
                  Hiervoor heb je een Barcode-klant-ID nodig (zie &quot;BPost-gegevens&quot; hierboven).
                </p>
              )}
            </fieldset>

            {currentStrategy === 'bpost-generates' && (
              <label className="bp-label">
                Barcodelengte
                <select name="barcodeLength" className="bp-input" defaultValue={currentLength}>
                  <option value="7">7 cijfers</option>
                  <option value="9">9 cijfers</option>
                  <option value="11">11 cijfers</option>
                </select>
              </label>
            )}

            {currentStrategy !== 'bpost-generates' && (
              <input type="hidden" name="barcodeLength" value={currentLength} />
            )}

            <button type="submit" className="bp-btn bp-btn--primary" style={{ marginTop: '0.25rem', width: 'fit-content' }}>
              Instellingen bewaren
            </button>
          </form>
        </section>

        <section className="bp-card bp-card--section">
          <h2 className="bp-section-title">De MCP-service koppelen</h2>
          <p className="bp-prose">
            Koppel deze service als <strong>connector</strong> aan je AI-agent (zoals <strong>Claude Desktop</strong> of <strong>Mistral Le Chat</strong>) via de onderstaande URL.
          </p>
          <p className="bp-prose" style={{ fontSize: '0.875rem', marginBottom: '0.35rem' }}>
            <strong>Server-URL:</strong>
          </p>
          <div style={{ marginBottom: '1.5rem' }}>
            <CopyCodeBlock code={MCP_URL} copyLabel="Server-URL kopiëren" />
          </div>

          <h3 className="bp-subtitle" style={{ marginTop: '1.5rem' }}>Authenticatie</h3>
          <p className="bp-prose">
            Voor interactief gebruik in een AI-agent verloopt de autorisatie via <strong>OAuth 2.1</strong> (eenmalige browserflow bij de eerste verbinding).
          </p>
          <p className="bp-prose" style={{ marginTop: '0.75rem' }}>
            Voor <strong>automatisering, pipelines of headless omgevingen</strong> kun je hieronder een vast <strong>App Token</strong> (Bearer) aanmaken.
          </p>

          <form action={generateToken} className="bp-form-grid" style={{ marginTop: '1.25rem', marginBottom: tokens.length ? '1.25rem' : '0' }}>
            <label className="bp-label">
              Nieuw token aanmaken (bv. CI-pipeline)
              <input name="label" className="bp-input" defaultValue="thuis-computer" required />
            </label>
            <button type="submit" className="bp-btn bp-btn--secondary" style={{ width: 'fit-content' }}>
              App-token genereren
            </button>
          </form>

          <h3 className="bp-subtitle" style={{ marginTop: tokens.length ? undefined : '1.25rem' }}>
            Actieve app-tokens ({tokens.length})
          </h3>
          {tokens.length === 0 ? (
            <p className="bp-empty-hint">Nog geen app-tokens. Maak er een aan voor headless scenario&apos;s.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tokens.map((t) => (
                <TokenRow
                  key={t.id}
                  token={{
                    id: t.id,
                    label: t.label,
                    createdAt: t.createdAt.toISOString(),
                    lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
                  }}
                />
              ))}
            </ul>
          )}
          <p className="bp-muted-note" style={{ marginTop: '1.25rem' }}>
            Hulp nodig bij de configuratie? Bekijk de{' '}
            <Link href="/install" className="bp-link">
              installatie-instructies
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="bp-muted-note" style={{ marginTop: '2rem' }}>
        <Link href="/" className="bp-link">
          ← Terug naar start
        </Link>
      </p>
    </main>
  )
}

// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { handleSignOut } from './actions'
import { TokenRow } from './TokenRow'
import { db } from '@/lib/db/client'
import { tenants, bpostCredentials, apiTokens } from '@/lib/db/schema'
import { encrypt, hashToken } from '@/lib/crypto'
import { eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'

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

  // Ensure we are only looking at the tenant associated with the current user
  const tenantId = (session.user as any).tenantId
  if (!tenantId) {
    // This should ideally not happen due to the signIn callback logic,
    // but we'll handle it for safety.
    return <div>No tenant associated with your account. Please contact support.</div>
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

  async function saveCreds(formData: FormData) {
    'use server'
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    const customerNumber = formData.get('customerNumber') as string
    const accountId = formData.get('accountId') as string
    const prsNumber = (formData.get('prsNumber') as string) || null
    const encKey = process.env.ENCRYPTION_KEY!

    // IMPORTANT: Use the session's tenantId directly within the action for security
    const session = await auth()
    const actionTenantId = (session?.user as any)?.tenantId
    if (!actionTenantId) throw new Error('Unauthorized')

    const numericOnly = /^\d{1,8}$/
    if (!numericOnly.test(customerNumber)) throw new Error('Customer Number must be 1–8 digits')
    if (!numericOnly.test(accountId)) throw new Error('Account ID must be 1–8 digits')
    if (prsNumber && !numericOnly.test(prsNumber)) throw new Error('PRS Number must be 1–8 digits')

    const { ciphertext, iv } = encrypt(password, encKey)

    const [existingCred] = await db
      .select()
      .from(bpostCredentials)
      .where(eq(bpostCredentials.tenantId, actionTenantId))
      .limit(1)

    if (existingCred) {
      await db
        .update(bpostCredentials)
        .set({ 
          username, 
          passwordEncrypted: ciphertext, 
          passwordIv: iv, 
          customerNumber, 
          accountId, 
          prsNumber, 
          updatedAt: new Date() 
        })
        .where(eq(bpostCredentials.tenantId, actionTenantId))
    } else {
      await db.insert(bpostCredentials).values({
        tenantId: actionTenantId,
        username,
        passwordEncrypted: ciphertext,
        passwordIv: iv,
        customerNumber,
        accountId,
        prsNumber,
      })
    }
    redirect('/dashboard')
  }

  async function generateToken(formData: FormData) {
    'use server'
    const label = (formData.get('label') as string) || 'claude-desktop'
    
    const session = await auth()
    const actionTenantId = (session?.user as any)?.tenantId
    if (!actionTenantId) redirect('/dashboard')

    const rawToken = `bpost_${randomBytes(32).toString('hex')}`
    const tokenHash = hashToken(rawToken)
    await db.insert(apiTokens).values({ 
      tenantId: actionTenantId, 
      tokenHash, 
      label 
    })
    redirect(`/dashboard?token=${encodeURIComponent(rawToken)}`)
  }

  return (
    <main style={{ 
      padding: '2rem', 
      fontFamily: 'monospace', 
      backgroundColor: '#000', 
      color: '#fff', 
      minHeight: '100vh' 
    }}>
      <h1 style={{ color: '#ff0000', textTransform: 'uppercase', letterSpacing: '0.1rem' }}>BPost MCP — Settings</h1>
      <p style={{ color: '#888' }}>Logged in as <span style={{ color: '#fff' }}>{session.user.email}</span></p>
      <form action={handleSignOut}>
        <button type="submit" style={{ 
          backgroundColor: '#333', 
          color: '#fff', 
          border: '1px solid #444', 
          padding: '0.5rem 1rem', 
          cursor: 'pointer',
          marginBottom: '2rem'
        }}>Sign out</button>
      </form>

      {newlyGeneratedToken && (
        <div style={{ 
          background: '#1a0000', 
          border: '2px solid #ff0000', 
          padding: '1rem', 
          margin: '1rem 0',
          boxShadow: '0 0 15px rgba(255,0,0,0.2)'
        }}>
          <strong style={{ color: '#ff0000' }}>⚠️ Copy your bearer token now — it will not be shown again:</strong><br />
          <code style={{ 
            wordBreak: 'break-all', 
            backgroundColor: '#000', 
            display: 'block', 
            padding: '0.5rem', 
            marginTop: '0.5rem',
            border: '1px solid #333'
          }}>{newlyGeneratedToken}</code>
        </div>
      )}

      <hr style={{ border: '0', borderTop: '1px solid #333', margin: '2rem 0' }} />
      
      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ color: '#ff0000', fontSize: '1.2rem', marginBottom: '1rem' }}>BPost Credentials</h2>
        {existingCreds && (
          <p style={{ color: '#00ff00', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            ✅ Credentials configured for user: <strong>{existingCreds.username}</strong>
          </p>
        )}
        
        <form action={saveCreds} style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            Username<br />
            <input 
              name="username" 
              defaultValue={existingCreds?.username ?? ''} 
              required 
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
            />
          </label>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            Password<br />
            <input 
              name="password" 
              type="password" 
              required 
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ color: '#888', fontSize: '0.8rem' }}>
              Customer Number<br />
              <input
                name="customerNumber"
                defaultValue={existingCreds?.customerNumber ?? ''}
                required
                pattern="\d{1,8}"
                maxLength={8}
                title="1–8 digits, numbers only"
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
              />
            </label>
            <label style={{ color: '#888', fontSize: '0.8rem' }}>
              Account ID<br />
              <input
                name="accountId"
                defaultValue={existingCreds?.accountId ?? ''}
                required
                pattern="\d{1,8}"
                maxLength={8}
                title="1–8 digits, numbers only"
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
              />
            </label>
          </div>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            PRS Number (optional)<br />
            <input
              name="prsNumber"
              defaultValue={existingCreds?.prsNumber ?? ''}
              pattern="\d{1,8}"
              maxLength={8}
              title="1–8 digits, numbers only"
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
            />
          </label>
          <button type="submit" style={{ 
            backgroundColor: '#ff0000', 
            color: '#fff', 
            border: 'none', 
            padding: '0.8rem', 
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '1rem'
          }}>Save Credentials</button>
        </form>
      </section>

      <hr style={{ border: '0', borderTop: '1px solid #333', margin: '2rem 0' }} />

      <section>
        <h2 style={{ color: '#ff0000', fontSize: '1.2rem', marginBottom: '1rem' }}>Bearer Tokens</h2>
        <form action={generateToken} style={{ display: 'grid', gap: '1rem', maxWidth: '400px', marginBottom: '2rem' }}>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            Label (e.g. "claude-desktop-prod")<br />
            <input 
              name="label" 
              defaultValue="claude-desktop" 
              required 
              style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
            />
          </label>
          <button type="submit" style={{ 
            backgroundColor: '#333', 
            color: '#fff', 
            border: '1px solid #444', 
            padding: '0.5rem 1rem', 
            cursor: 'pointer'
          }}>Generate Token</button>
        </form>

        <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>
          Tokens ({tokens.length})
        </h3>
        <ul style={{ listStyle: 'none', padding: '0', fontSize: '0.9rem' }}>
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
      </section>

      <hr style={{ border: '0', borderTop: '1px solid #333', margin: '2rem 0' }} />

      <section>
        <h2 style={{ color: '#ff0000', fontSize: '1.2rem', marginBottom: '1rem' }}>Claude / MCP Clients</h2>
        <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Verbind Claude met je BPost account:
        </p>
        <div style={{
          background: '#111',
          border: '1px solid #333',
          borderRadius: '4px',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#00ff00',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <code>{`${process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app'}/api/mcp`}</code>
        </div>
        <p style={{ color: '#888', fontSize: '0.8rem' }}>
          Plak deze URL in Claude Desktop onder Settings &gt; MCP Servers.
          Claude regelt de login automatisch via Google.
        </p>
        <a
          href="/install"
          style={{
            display: 'inline-block',
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: '#ff0000',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          How to connect →
        </a>
      </section>
    </main>
  )
}

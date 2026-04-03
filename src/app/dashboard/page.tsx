// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
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
    redirect('/api/auth/signin')
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
      <form action={signOut as any}>
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
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
              />
            </label>
            <label style={{ color: '#888', fontSize: '0.8rem' }}>
              Account ID<br />
              <input 
                name="accountId" 
                defaultValue={existingCreds?.accountId ?? ''} 
                required 
                style={{ width: '100%', padding: '0.5rem', backgroundColor: '#111', border: '1px solid #333', color: '#fff', marginTop: '0.3rem' }}
              />
            </label>
          </div>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>
            PRS Number (optional)<br />
            <input 
              name="prsNumber" 
              defaultValue={existingCreds?.prsNumber ?? ''} 
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
          Active tokens ({tokens.filter((t) => !t.revokedAt).length})
        </h3>
        <ul style={{ listStyle: 'none', padding: '0', fontSize: '0.9rem' }}>
          {tokens.map((t) => (
            <li key={t.id} style={{ 
              backgroundColor: '#111', 
              padding: '0.8rem', 
              marginBottom: '0.5rem', 
              border: '1px solid #222',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong style={{ color: '#fff' }}>{t.label}</strong><br />
                <span style={{ fontSize: '0.7rem', color: '#666' }}>Created {t.createdAt.toISOString()}</span>
              </div>
              <span style={{ color: t.revokedAt ? '#ff0000' : '#00ff00', fontSize: '0.7rem' }}>
                {t.revokedAt ? 'REVOKED' : 'ACTIVE'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

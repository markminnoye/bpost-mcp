import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { auth, signOut } from '@/lib/auth'
import { APP_VERSION } from '@/lib/app-version'
import { db } from '@/lib/db/client'
import { bpostCredentials } from '@/lib/db/schema'

export const metadata: Metadata = {
  title: 'Koppelen met bpost',
  description: 'Koppel je assistent aan je bpost-account.',
}

/**
 * Landing for this service. OAuth sends a signed-in user without bpost credentials here.
 * Mailings themselves live in the separate webapp.
 */
export default async function HomePage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  const ready = tenantId ? await hasBpostLogin(tenantId) : false

  async function signOutAction() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <main className="bp-shell bp-shell--narrow">
      <h1 className="bp-page-title">Koppelen met bpost</h1>
      <p className="bp-page-lead">
        Hier koppel je een assistent aan je bpost-account. Mailings zelf maak je in de mailings-toepassing.
      </p>
      {session?.user && !tenantId ? (
        <>
          <p className="bp-prose" role="alert">
            Je account is nog niet gekoppeld aan een organisatie. Vraag Sonic Rocket om je toe te voegen.
          </p>
          <form action={signOutAction}>
            <button type="submit" className="bp-btn bp-btn--primary">
              Afmelden
            </button>
          </form>
        </>
      ) : null}
      {tenantId && !ready ? (
        <p className="bp-prose" role="alert">
          Je bpost-gegevens staan nog niet klaar. Vul die in de mailings-toepassing in en probeer daarna opnieuw te koppelen.
        </p>
      ) : null}
      {tenantId && ready ? (
        <p className="bp-prose">Je bpost-gegevens staan klaar. Je kan je assistent verder koppelen.</p>
      ) : null}
      <p>
        <Link href="/install" className="bp-btn bp-btn--primary">
          Naar de koppeling
        </Link>
      </p>
      <p className="bp-prose">
        <small>Alfaversie {APP_VERSION} · door Sonic Rocket</small>
      </p>
    </main>
  )
}

/** True when this organisation already stored a bpost login. */
async function hasBpostLogin(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ id: bpostCredentials.id })
    .from(bpostCredentials)
    .where(eq(bpostCredentials.tenantId, tenantId))
    .limit(1)
  return rows.length > 0
}

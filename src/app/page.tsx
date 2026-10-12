import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { IconMail } from '@tabler/icons-react'
import { auth, signIn } from '@/lib/auth'
import { APP_VERSION } from '@/lib/app-version'
import { getTenantSettings } from '@/lib/tenant/settings'
import { signOutAction } from '@/components/app-shell/actions'
import '@/components/app-shell/tokens.css'
import styles from '@/components/app-shell/app.module.css'

export const metadata: Metadata = { title: 'Mailings voor e-MassPost' }

/** Home (SR-112 decision 6): only "Aanmelden met Google"; signed in, straight to the mailings. */
export default async function HomePage() {
  const session = await auth()
  // Only with an existing organisation: the app sends a user without one back here (no loop).
  const tenantId = session?.user?.tenantId
  if (tenantId && (await getTenantSettings(tenantId))) redirect('/mailings')
  const withoutOrganisation = !!session?.user

  async function signInWithGoogle() {
    'use server'
    await signIn('google', { redirectTo: '/mailings' })
  }

  return (
    <div className={`app ${styles.home}`}>
      <main className={styles.login}>
        <div className={styles.mark} aria-hidden="true">
          <IconMail size={26} stroke={1.75} />
        </div>
        <h1>Mailings voor e-MassPost</h1>
        <p>Adreslijsten controleren en mailings voorbereiden voor bpost.</p>
        {withoutOrganisation ? (
          <>
            <p role="alert">
              Je account is nog niet gekoppeld aan een organisatie. Vraag Sonic Rocket om je toe te voegen.
            </p>
            <form action={signOutAction}>
              <button type="submit" className={styles.gbtn}>
                Afmelden
              </button>
            </form>
          </>
        ) : (
          <form action={signInWithGoogle}>
            <button type="submit" className={styles.gbtn}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Aanmelden met Google
            </button>
          </form>
        )}
        <small>Alfaversie {APP_VERSION} · door Sonic Rocket</small>
      </main>
    </div>
  )
}

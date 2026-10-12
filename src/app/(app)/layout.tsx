import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
import { AppShell } from '@/components/app-shell/AppShell'
import { MailingStoreProvider } from '@/components/mailings/MailingStoreProvider'

/** Everything behind the login: the shell with the tenant and the user. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user?.email || !session.user.tenantId) redirect('/')
  const settings = await getTenantSettings(session.user.tenantId)
  if (!settings) redirect('/')
  const user = { name: session.user.name ?? session.user.email, email: session.user.email, image: session.user.image }
  return (
    <AppShell tenantName={settings.name} user={user}>
      <MailingStoreProvider user={{ email: session.user.email }} tenantId={session.user.tenantId}>{children}</MailingStoreProvider>
    </AppShell>
  )
}

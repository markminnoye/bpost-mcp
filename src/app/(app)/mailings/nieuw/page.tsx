import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
import { ImportStep } from '@/components/mailing-flow/ImportStep'

export const metadata: Metadata = { title: 'Nieuwe mailing · Mailings voor e-MassPost' }

/** Step 1 of a new mailing (SR-112 §5). */
export default async function NewMailingPage() {
  const session = await auth()
  const settings = session?.user?.tenantId ? await getTenantSettings(session.user.tenantId) : null
  if (!settings) redirect('/')
  return <ImportStep defaults={settings.defaults} />
}

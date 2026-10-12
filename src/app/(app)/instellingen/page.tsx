import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantSettings } from '@/lib/tenant/settings'
import { SettingsForms } from '@/components/settings/SettingsForms'

export const metadata: Metadata = { title: 'Instellingen · Mailings voor e-MassPost' }

/** Instellingen: the settings of the organisation (replaces the dashboard, SR-112 decision 13). */
export default async function SettingsPage() {
  const session = await auth()
  const settings = session?.user?.tenantId ? await getTenantSettings(session.user.tenantId) : null
  if (!settings) redirect('/')
  return <SettingsForms settings={settings} />
}

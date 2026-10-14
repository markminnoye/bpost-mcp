import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { env } from '@/lib/config/env'
import { getTenantSettings } from '@/lib/tenant/settings'
import { isProviderModel } from '@/lib/masspost/suggest-mapping-ai'
import { MailingPage } from '@/components/mailing-flow/MailingPage'

export const metadata: Metadata = { title: 'Mailing · Mailings voor e-MassPost' }

/** One mailing: its flow, on the furthest valid step, or on step 1 with `?stap=gegevens`. */
export default async function MailingRoute({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>
  searchParams: Promise<{ stap?: string }>
}) {
  const { code } = await params
  const { stap } = await searchParams
  const model = env.MASSPOST_SUGGEST_MAPPING_MODEL?.trim()
  const session = await auth()
  const settings = session?.user?.tenantId ? await getTenantSettings(session.user.tenantId) : null
  // Only the numbers the XML repeats; the password stays on the server (design 13/10, decision 10).
  const bpost =
    settings?.bpost?.customerNumber && settings.bpost.accountId
      ? { customerId: settings.bpost.customerNumber, accountId: settings.bpost.accountId }
      : null
  return (
    <MailingPage
      code={decodeURIComponent(code)}
      editDetails={stap === 'gegevens'}
      docsUrl={env.NEXT_PUBLIC_DOCS_URL}
      aiModel={isProviderModel(model) ? model : undefined}
      bpost={bpost}
      defaultNotifyEmail={settings?.defaults.notifyEmail ?? ''}
    />
  )
}

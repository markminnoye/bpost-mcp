import type { Metadata } from 'next'
import { env } from '@/lib/config/env'
import { isProviderModel } from '@/lib/masspost/suggest-mapping-ai'
import { PocFlow } from './PocFlow'

export const metadata: Metadata = {
  title: 'Proef: adreslijst nakijken',
  description: 'Proefversie: een adreslijst inlezen, de kolommen koppelen en nakijken op de regels van bpost.',
  robots: { index: false, follow: false },
}

/**
 * POC of upload, column mapping and format validation. Runs in the browser, nothing stored. The AI
 * proposal switch appears only when a model is set up; it needs a login (ADR 0006).
 */
export default function MasspostPocPage() {
  const model = env.MASSPOST_SUGGEST_MAPPING_MODEL?.trim()
  return <PocFlow docsUrl={env.NEXT_PUBLIC_DOCS_URL} aiModel={isProviderModel(model) ? model : undefined} />
}

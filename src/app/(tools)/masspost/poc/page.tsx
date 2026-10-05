import type { Metadata } from 'next'
import { env } from '@/lib/config/env'
import { PocFlow } from './PocFlow'

export const metadata: Metadata = {
  title: 'Proef: adreslijst nakijken',
  description: 'Proefversie: een adreslijst inlezen, de kolommen koppelen en nakijken op de regels van bpost.',
  robots: { index: false, follow: false },
}

/** POC of upload, column mapping and format validation. Runs fully in the browser: no login, nothing stored. */
export default function MasspostPocPage() {
  return <PocFlow docsUrl={env.NEXT_PUBLIC_DOCS_URL} />
}

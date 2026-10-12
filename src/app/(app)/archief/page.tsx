import type { Metadata } from 'next'
import { MailingList } from '@/components/mailings/MailingList'

export const metadata: Metadata = { title: 'Archief · Mailings voor e-MassPost' }

/** Mailings someone archived by hand (SR-112 decision 11). */
export default function ArchivePage() {
  return <MailingList archived />
}

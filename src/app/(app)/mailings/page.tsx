import type { Metadata } from 'next'
import { MailingList } from '@/components/mailings/MailingList'

export const metadata: Metadata = { title: 'Mailings · Mailings voor e-MassPost' }

/** The list of mailings (SR-112 §4). */
export default function MailingsPage() {
  return <MailingList archived={false} />
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Mijn mailings | Contrapunt', description: 'Beheer bpost e-MassPost mailings en adresvalidatie voor Contrapunt.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="nl"><body>{children}</body></html> }

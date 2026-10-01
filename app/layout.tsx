import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Adresvalidatie | bpost', description: 'Bekijk en corrigeer adresproblemen voor uw mailing.' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="nl"><body>{children}</body></html> }

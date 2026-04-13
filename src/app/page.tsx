import { AlphaServiceBanner } from '@/components/customer/AlphaServiceBanner'
import { APP_VERSION } from '@/lib/app-version'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="bp-home">
      <div className="bp-home-hero-bg">
        <Image
          src="/images/hero-background.png"
          alt="BPost Background"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
      </div>

      <div className="bp-home-content">
        <h1 className="bp-home-title">MCP-service voor BPost e-MassPost</h1>
        <p className="bp-home-lead">
          Verbind je AI-assistent met bpost om je mailings via e-MassPost te controleren en te verzenden.
        </p>
        <div style={{ width: 'min(36rem, 100%)', textAlign: 'left' }}>
          <AlphaServiceBanner />
        </div>
        <p className="bp-muted-note" style={{ margin: 0 }}>
          Versie {APP_VERSION}
        </p>

        <div className="bp-install-grid bp-home-choice">
          <a
            href="https://github.com/markminnoye/bpost-e-masspost-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="bp-install-card"
          >
            <div className="bp-install-card-title">Skills voor BPost e-MassPost downloaden</div>
            <p className="bp-install-card-item">
            Optimaliseer uw workflow met de bpost e-MassPost skill. Deze skill biedt uw AI-assistent de specifieke achtergrondinformatie die nodig is om uw mailingvoorbereiding volledig te ondersteunen.
            </p>
          </a>
          <a href="/dashboard" className="bp-install-card">
            <div className="bp-install-card-title">Verbinden met de MCP-service</div>
            <p className="bp-install-card-item">
            Verbind uw AI-assistent via het MCP-protocol met bpost. Zo kan uw agent niet alleen teksten genereren, maar ook daadwerkelijk mailings versturen en poststromen binnen uw organisatie afhandelen.
            </p>
          </a>
        </div>
      </div>
    </div>
  )
}

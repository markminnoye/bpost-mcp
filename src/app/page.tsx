import { AlphaServiceBanner } from '@/components/customer/AlphaServiceBanner'
import { APP_VERSION } from '@/lib/app-version'

export default function Home() {
  return (
    <div className="bp-home">
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
      <div className="bp-home-cta">
        <a href="/dashboard" className="bp-btn bp-btn--primary">
          Naar je account
        </a>
      </div>
      <p className="bp-home-footer-note">
        De{' '}
        <a
          href="https://github.com/markminnoye/bpost-e-masspost-skills"
          target="_blank"
          rel="noopener noreferrer"
          className="bp-link"
        >
          e-MassPost skill-bibliotheek op GitHub
        </a>{' '}
        legt uit hoe je AI-assistent de regels van bpost leert kennen en jouw mailings controleert.
      </p>
    </div>
  )
}

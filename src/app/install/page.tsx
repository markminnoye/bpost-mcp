import { env } from '@/lib/config/env'
import { CopyInstallPromptButton } from '@/app/install/CopyInstallPromptButton'
import { CopyCodeBlock } from '@/components/customer/CopyCodeBlock'
import { AlphaServiceBanner } from '@/components/customer/AlphaServiceBanner'

const BASE_URL = env.NEXT_PUBLIC_BASE_URL
const MCP_URL = `${BASE_URL}/api/mcp`

export const metadata = {
  title: 'Installatie — MCP-service voor BPost e-MassPost (alfa)',
  description:
    'Alfaversie: sluit Claude Desktop of Mistral Le Chat aan bij je bpost-account via OAuth 2.1 of een vast App Token.',
}

export default function InstallPage() {
  const desktopOAuthSnippet = JSON.stringify({ mcpServers: { bpost: { url: MCP_URL } } }, null, 2)

  const desktopBearerSnippet = JSON.stringify(
    {
      mcpServers: {
        bpost: {
          url: MCP_URL,
          headers: { Authorization: 'Bearer <jouw-token>' },
        },
      },
    },
    null,
    2,
  )

  const codeOAuthSnippet = `claude mcp add bpost ${MCP_URL} --transport http`
  const codeBearerSnippet = `claude mcp add bpost ${MCP_URL} --transport http --header "Authorization: Bearer <jouw-token>"`

  return (
    <main className="bp-shell">
      <h1 className="bp-page-title">De MCP-service koppelen</h1>
      <AlphaServiceBanner />
      <p className="bp-page-lead">
        Om deze service als <strong>connector</strong> toe te voegen aan je AI-agent (zoals <strong>Claude Desktop</strong> of <strong>Mistral Le Chat</strong>), gebruik je de onderstaande URL. Kopieer deze link en plak hem in de configuratie van je programma (meestal onder de instelling <strong>MCP Servers</strong>, <strong>Connectors</strong> of <strong>Tools</strong>).
      </p>

      <section className="bp-section">
        <h2 className="bp-section-title" style={{ fontSize: '1.1rem' }}>
          Service URL
        </h2>
        <CopyCodeBlock code={MCP_URL} copyLabel="URL kopiëren" />
      </section>

      <section className="bp-section">
        <h2 className="bp-subtitle" style={{ marginTop: 0 }}>
          Authenticatie: twee mogelijkheden
        </h2>
        <p className="bp-prose">
          Afhankelijk van hoe je de service integreert, zijn er twee manieren om de toegang te autoriseren:
        </p>
        <div className="bp-install-grid">
          <a href="#oauth" className="bp-install-card">
            <div className="bp-install-card-title">
              1. OAuth 2.1 <span className="bp-badge">aanbevolen</span>
            </div>
            <p className="bp-install-card-item"><strong>Voor interactief gebruik:</strong> De client start bij de eerste verbinding een browserflow.</p>
            <p className="bp-install-card-item">Je autoriseert eenmalig via Google; geen handmatige tokens nodig.</p>
          </a>
          <a href="#bearer" className="bp-install-card">
            <div className="bp-install-card-title">2. App Tokens</div>
            <p className="bp-install-card-item"><strong>Voor automatisering en pipelines:</strong> Gebruik een vast Bearer-token voor headless omgevingen.</p>
            <p className="bp-install-card-item">Handig voor CI/CD of scripts waar een interactieve login niet mogelijk is.</p>
          </a>
        </div>
      </section>

      <hr className="bp-hr" />

      <section id="oauth" className="bp-section">
        <h2 className="bp-section-title">A — OAuth 2.1 (Interactief)</h2>
        <p className="bp-prose">
          Voor de meeste gebruikers in een desktop-app of web-interface is dit de eenvoudigste methode.
          Zodra je de URL hebt toegevoegd, zal de client bij de eerste verbinding een <strong>browserflow</strong> starten.
          Je autoriseert de toegang dan eenmalig via je Google-account. De client regelt de verversing van de sessie op de achtergrond.
        </p>

        <h3 className="bp-subtitle">Claude Desktop</h3>
        <p className="bp-prose">
          Voeg de MCP-server-URL toe aan je <code>claude_desktop_config.json</code>:
        </p>
        <CopyCodeBlock code={desktopOAuthSnippet} copyLabel="JSON-configuratie kopiëren" />
        <p className="bp-muted-note">
          Bij de eerste verbinding opent Claude een browservenster om aan te melden.
        </p>

        <h3 className="bp-subtitle">Claude Code</h3>
        <p className="bp-prose">Voeg de server toe via de opdrachtregel:</p>
        <CopyCodeBlock code={codeOAuthSnippet} copyLabel="Terminalcommando kopiëren" />
        <p className="bp-muted-note">Claude Code vraagt bij het eerste gebruik om aanmelding met Google.</p>
      </section>

      <hr className="bp-hr" />

      <section id="bearer" className="bp-section">
        <h2 className="bp-section-title">B — App Tokens (Headless)</h2>
        <p className="bp-prose">
          Voor scenario&apos;s zonder browser-interactie — zoals <strong>CI/CD pipelines</strong>, <strong>server-side scripts</strong> of <strong>headless automatiseringen</strong> — kun je gebruikmaken van een vast <strong>Bearer-token</strong>.
          Je genereert dit token in je dashboard en voegt het handmatig toe aan de HTTP-headers van je MCP-client (<code>Authorization: Bearer &lt;jouw-token&gt;</code>).
        </p>

        <p className="bp-prose" style={{ marginBottom: '0.5rem' }}>
          <strong>Stap 1 — Maak een app-token aan:</strong> meld je aan bij je account en maak onder
          &ldquo;App Tokens&rdquo; een nieuw token.
        </p>
        <div className="bp-btn-row" style={{ marginBottom: '1.25rem' }}>
          <a href="/dashboard" className="bp-btn bp-btn--primary">
            Naar je account →
          </a>
        </div>

        <h3 className="bp-subtitle">Claude Desktop</h3>
        <p className="bp-prose">
          Voeg de MCP-server-URL en je app-token toe aan <code>claude_desktop_config.json</code>:
        </p>
        <CopyCodeBlock code={desktopBearerSnippet} copyLabel="JSON-configuratie kopiëren" />
        <p className="bp-muted-note">
          Vervang <code>&lt;jouw-token&gt;</code> door het token uit je account. Dat token zie je maar één
          keer.
        </p>

        <h3 className="bp-subtitle">Claude Code</h3>
        <p className="bp-prose">Voeg de server toe via de opdrachtregel:</p>
        <CopyCodeBlock code={codeBearerSnippet} copyLabel="Terminalcommando kopiëren" />
      </section>

      <hr className="bp-hr" />

      <footer style={{ fontSize: '0.875rem', color: 'var(--bp-soft)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <a href="/dashboard" className="bp-link">
            ← Terug naar je account
          </a>
        </div>
        <div>
          Hulp nodig? Neem contact op met support of bekijk de{' '}
          <a
            href="https://github.com/markminnoye/bpost-e-masspost-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="bp-link"
          >
            technische documentatie op GitHub
          </a>
          .
        </div>
      </footer>
    </main>
  )
}

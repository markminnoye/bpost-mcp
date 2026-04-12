import { env } from '@/lib/config/env'
import { CopyInstallPromptButton } from '@/app/install/CopyInstallPromptButton'
import { CopyCodeBlock } from '@/components/customer/CopyCodeBlock'
import { AlphaServiceBanner } from '@/components/customer/AlphaServiceBanner'

const BASE_URL = env.NEXT_PUBLIC_BASE_URL
const MCP_URL = `${BASE_URL}/api/mcp`

export const metadata = {
  title: 'Installatie — MCP-service voor BPost e-MassPost (alfa)',
  description:
    'Alfaversie: sluit Claude Desktop of Claude Code aan bij je bpost-account (OAuth of vaste sleutel). Gebruik bij voorkeur de testomgeving van bpost.',
}

export default function InstallPage() {
  const desktopOAuthSnippet = JSON.stringify({ mcpServers: { bpost: { url: MCP_URL } } }, null, 2)

  const desktopBearerSnippet = JSON.stringify(
    {
      mcpServers: {
        bpost: {
          url: MCP_URL,
          headers: { Authorization: 'Bearer <jouw-sleutel>' },
        },
      },
    },
    null,
    2,
  )

  const codeOAuthSnippet = `claude mcp add bpost ${MCP_URL} --transport http`
  const codeBearerSnippet = `claude mcp add bpost ${MCP_URL} --transport http --header "Authorization: Bearer <jouw-sleutel>"`

  return (
    <main className="bp-shell">
      <h1 className="bp-page-title">Aansluiten op de MCP-service</h1>
      <AlphaServiceBanner />
      <p className="bp-page-lead">
        Volg de stappen hieronder om Claude Desktop of Claude Code te koppelen aan je account voor deze
        dienst.
      </p>

      <section className="bp-section">
        <h2 className="bp-section-title" style={{ fontSize: '1.1rem' }}>
          Voor je AI-assistent
        </h2>
        <p className="bp-prose">
          Met één klik kopieer je de volledige begeleidingsprompt naar je klembord. Plak die daarna in
          Claude of een andere ondersteunde assistent: die helpt je stap voor stap, in begrijpelijke taal,
          zonder moeilijke termen.
        </p>
        <CopyInstallPromptButton />
      </section>

      <section className="bp-section">
        <h2 className="bp-subtitle" style={{ marginTop: 0 }}>
          Welke manier past bij jou?
        </h2>
        <div className="bp-install-grid">
          <a href="#oauth" className="bp-install-card">
            <div className="bp-install-card-title">
              OAuth 2.0 <span className="bp-badge">aanbevolen</span>
            </div>
            <p className="bp-install-card-item">Aanmelden met Google — geen sleutel om bij te houden</p>
            <p className="bp-install-card-item">Meest geschikt voor persoonlijk gebruik</p>
            <p className="bp-install-card-item">Aanmelden gebeurt automatisch in je browser</p>
          </a>
          <a href="#bearer" className="bp-install-card">
            <div className="bp-install-card-title">Vaste sleutel (Bearer)</div>
            <p className="bp-install-card-item">Je plakt één vaste sleutel in je configuratie</p>
            <p className="bp-install-card-item">Handig voor automatisering of gedeelde omgevingen</p>
            <p className="bp-install-card-item">Je maakt de sleutel één keer aan in je account</p>
          </a>
        </div>
      </section>

      <hr className="bp-hr" />

      <section id="oauth" className="bp-section">
        <h2 className="bp-section-title">A — OAuth 2.0</h2>
        <p className="bp-prose">
          De MCP-server regelt de aanmelding met Google automatisch wanneer Claude verbinding maakt. Je
          hoeft geen sleutel te kopiëren of bij te houden: voeg alleen de server-URL toe en bij de eerste
          verbinding opent Claude een browservenster om aan te melden.
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
        <h2 className="bp-section-title">B — Vaste sleutel (Bearer)</h2>
        <p className="bp-prose">
          Gebruik deze manier als je liever met één vaste sleutel werkt, of als je MCP instelt voor een
          gedeelde of geautomatiseerde omgeving.
        </p>

        <p className="bp-prose" style={{ marginBottom: '0.5rem' }}>
          <strong>Stap 1 — Maak een sleutel aan:</strong> meld je aan bij je account en maak onder
          &ldquo;Sleutels voor apps&rdquo; een nieuwe sleutel.
        </p>
        <div className="bp-btn-row" style={{ marginBottom: '1.25rem' }}>
          <a href="/dashboard" className="bp-btn bp-btn--primary">
            Naar je account →
          </a>
        </div>

        <h3 className="bp-subtitle">Claude Desktop</h3>
        <p className="bp-prose">
          Voeg de MCP-server-URL en je sleutel toe aan <code>claude_desktop_config.json</code>:
        </p>
        <CopyCodeBlock code={desktopBearerSnippet} copyLabel="JSON-configuratie kopiëren" />
        <p className="bp-muted-note">
          Vervang <code>&lt;jouw-sleutel&gt;</code> door de sleutel uit je account. Die sleutel zie je maar
          één keer.
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

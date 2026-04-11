import { env } from '@/lib/config/env'
import { CopyInstallPromptButton } from '@/app/install/CopyInstallPromptButton'
import { CopyCodeBlock } from '@/components/customer/CopyCodeBlock'

const BASE_URL = env.NEXT_PUBLIC_BASE_URL
const MCP_URL = `${BASE_URL}/api/mcp`

export const metadata = {
  title: 'Install — BPost MCP',
  description:
    'Connect Claude Desktop or Claude Code to your BPost account via OAuth 2.0 or Bearer Token.',
}

export default function InstallPage() {
  const desktopOAuthSnippet = JSON.stringify({ mcpServers: { bpost: { url: MCP_URL } } }, null, 2)

  const desktopBearerSnippet = JSON.stringify(
    {
      mcpServers: {
        bpost: {
          url: MCP_URL,
          headers: { Authorization: 'Bearer <your-token>' },
        },
      },
    },
    null,
    2,
  )

  const codeOAuthSnippet = `claude mcp add bpost ${MCP_URL} --transport http`
  const codeBearerSnippet = `claude mcp add bpost ${MCP_URL} --transport http --header "Authorization: Bearer <your-token>"`

  return (
    <main className="bp-shell">
      <h1 className="bp-page-title">Connect to BPost MCP</h1>
      <p className="bp-page-lead">
        Follow the steps below to connect Claude Desktop or Claude Code to your BPost account.
      </p>

      <section className="bp-section">
        <h2 className="bp-section-title" style={{ fontSize: '1.1rem' }}>
          Voor je AI-assistent
        </h2>
        <p className="bp-prose">
          Met één klik kopieer je de volledige begeleidingsprompt (Nederlands en Engels) naar je klembord.
          Plak die daarna in Claude of een andere ondersteunde assistent: die helpt je stap voor stap, in
          begrijpelijke taal, zonder moeilijke termen.
        </p>
        <CopyInstallPromptButton />
      </section>

      <section className="bp-section">
        <h2 className="bp-subtitle" style={{ marginTop: 0 }}>
          Which method is right for you?
        </h2>
        <div className="bp-install-grid">
          <a href="#oauth" className="bp-install-card">
            <div className="bp-install-card-title">
              OAuth 2.0{' '}
              <span className="bp-badge">recommended</span>
            </div>
            <p className="bp-install-card-item">Sign in with Google — no token to manage</p>
            <p className="bp-install-card-item">Recommended for personal use</p>
            <p className="bp-install-card-item">Login happens automatically in the browser</p>
          </a>
          <a href="#bearer" className="bp-install-card">
            <div className="bp-install-card-title">Bearer Token</div>
            <p className="bp-install-card-item">Paste a static token into your config</p>
            <p className="bp-install-card-item">Recommended for automation or shared setups</p>
            <p className="bp-install-card-item">Token is generated once in the dashboard</p>
          </a>
        </div>
      </section>

      <hr className="bp-hr" />

      <section id="oauth" className="bp-section">
        <h2 className="bp-section-title">A — OAuth 2.0</h2>
        <p className="bp-prose">
          The MCP server handles Google login automatically when Claude connects. No token to copy or
          manage — just add the server URL and Claude will open a browser login window on first connect.
        </p>

        <h3 className="bp-subtitle">Claude Desktop</h3>
        <p className="bp-prose">
          Add the MCP server URL to your <code>claude_desktop_config.json</code>:
        </p>
        <CopyCodeBlock code={desktopOAuthSnippet} copyLabel="JSON-configuratie kopiëren" />
        <p className="bp-muted-note">Claude will open a browser login window the first time it connects.</p>

        <h3 className="bp-subtitle">Claude Code</h3>
        <p className="bp-prose">Add via CLI:</p>
        <CopyCodeBlock code={codeOAuthSnippet} copyLabel="Terminalcommando kopiëren" />
        <p className="bp-muted-note">Claude Code will prompt for Google login on first use.</p>
      </section>

      <hr className="bp-hr" />

      <section id="bearer" className="bp-section">
        <h2 className="bp-section-title">B — Bearer Token</h2>
        <p className="bp-prose">
          Use this method if you prefer a static token, or if you&apos;re configuring MCP for a shared or
          automated setup.
        </p>

        <p className="bp-prose" style={{ marginBottom: '0.5rem' }}>
          <strong>Step 1 — Generate a token:</strong> Log in to the dashboard and generate a Bearer Token
          under the &ldquo;Bearer Tokens&rdquo; section.
        </p>
        <div className="bp-btn-row" style={{ marginBottom: '1.25rem' }}>
          <a href="/dashboard" className="bp-btn bp-btn--primary">
            Go to Dashboard →
          </a>
        </div>

        <h3 className="bp-subtitle">Claude Desktop</h3>
        <p className="bp-prose">
          Add the MCP server URL and your token to <code>claude_desktop_config.json</code>:
        </p>
        <CopyCodeBlock code={desktopBearerSnippet} copyLabel="JSON-configuratie kopiëren" />
        <p className="bp-muted-note">
          Replace <code>&lt;your-token&gt;</code> with the token copied from the dashboard. The token is only
          shown once.
        </p>

        <h3 className="bp-subtitle">Claude Code</h3>
        <p className="bp-prose">Add via CLI:</p>
        <CopyCodeBlock code={codeBearerSnippet} copyLabel="Terminalcommando kopiëren" />
      </section>

      <hr className="bp-hr" />

      <footer style={{ fontSize: '0.875rem', color: 'var(--bp-soft)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div>
          <a href="/dashboard" className="bp-link">
            ← Back to Dashboard
          </a>
        </div>
        <div>
          Need help? Contact support or visit the{' '}
          <a
            href="https://github.com/markminnoye/bpost-e-masspost-skills"
            target="_blank"
            rel="noopener noreferrer"
            className="bp-link"
          >
            Skills Documentation
          </a>
          .
        </div>
      </footer>
    </main>
  )
}

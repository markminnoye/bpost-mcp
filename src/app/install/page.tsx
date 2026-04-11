import { env } from '@/lib/config/env'
import { CopyInstallPromptButton } from '@/app/install/CopyInstallPromptButton'

const BASE_URL = env.NEXT_PUBLIC_BASE_URL
const MCP_URL = `${BASE_URL}/api/mcp`

export const metadata = {
  title: 'Install — BPost MCP',
  description: 'Connect Claude Desktop or Claude Code to your BPost account via OAuth 2.0 or Bearer Token.',
}

const styles = {
  page: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '3rem 2rem',
    fontFamily: 'system-ui, sans-serif',
    color: '#171717',
    backgroundColor: '#fafafa',
    minHeight: '100vh',
  } as const,
  heading1: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#e30613',
    marginBottom: '0.5rem',
  } as const,
  subtitle: {
    fontSize: '1rem',
    color: '#555',
    marginBottom: '2rem',
  } as const,
  cardsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '3rem',
  } as const,
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.25rem',
  } as const,
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#171717',
    marginBottom: '0.75rem',
  } as const,
  cardItem: {
    fontSize: '0.875rem',
    color: '#555',
    marginBottom: '0.4rem',
  } as const,
  section: {
    marginBottom: '3rem',
  } as const,
  heading2: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#e30613',
    marginBottom: '0.75rem',
    paddingTop: '0.5rem',
  } as const,
  heading3: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#171717',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
  } as const,
  intro: {
    fontSize: '0.95rem',
    color: '#555',
    marginBottom: '1rem',
    lineHeight: '1.6',
  } as const,
  codeBlock: {
    background: '#f4f4f4',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '1rem',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    color: '#171717',
    whiteSpace: 'pre',
    overflowX: 'auto',
    marginBottom: '0.5rem',
  } as const,
  note: {
    fontSize: '0.8rem',
    color: '#777',
    marginBottom: '1rem',
  } as const,
  ctaLink: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    backgroundColor: '#e30613',
    color: '#fff',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '0.9rem',
    textDecoration: 'none',
    marginBottom: '1rem',
  } as const,
  hr: {
    border: 'none',
    borderTop: '1px solid #e0e0e0',
    margin: '2.5rem 0',
  } as const,
  footer: {
    fontSize: '0.875rem',
    color: '#777',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  } as const,
  footerLink: {
    color: '#e30613',
    textDecoration: 'none',
  } as const,
}

export default function InstallPage() {
  const desktopOAuthSnippet = JSON.stringify(
    { mcpServers: { bpost: { url: MCP_URL } } },
    null,
    2,
  )

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
    <main style={styles.page}>
      {/* Header */}
      <h1 style={styles.heading1}>Connect to BPost MCP</h1>
      <p style={styles.subtitle}>
        Follow the steps below to connect Claude Desktop or Claude Code to your BPost account.
      </p>

      <section style={{ ...styles.section, marginBottom: '2rem' }}>
        <h2 style={{ ...styles.heading2, fontSize: '1.15rem', marginBottom: '0.5rem' }}>
          Voor je AI-assistent
        </h2>
        <p style={styles.intro}>
          Met één klik kopieer je de volledige begeleidingsprompt (Nederlands en Engels) naar je klembord.
          Plak die daarna in Claude of een andere ondersteunde assistent: die helpt je stap voor stap,
          in begrijpelijke taal, zonder technisch jargon.
        </p>
        <CopyInstallPromptButton />
      </section>

      {/* Which method? */}
      <style>{`
        .install-card {
          display: block;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }
        .install-card:hover {
          outline: 2px solid #e30613;
          box-shadow: 0 2px 10px rgba(227,6,19,0.15);
        }
      `}</style>
      <section style={styles.section}>
        <h3 style={styles.heading3}>
          Which method is right for you?
        </h3>
        <div style={styles.cardsRow}>
          <a href="#oauth" className="install-card" style={styles.card}>
            <div style={styles.cardTitle}>
              OAuth 2.0{' '}
              <span style={{ fontSize: '0.7rem', backgroundColor: '#e30613', color: '#fff', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: '600', verticalAlign: 'middle' }}>
                recommended
              </span>
            </div>
            <p style={styles.cardItem}>Sign in with Google — no token to manage</p>
            <p style={styles.cardItem}>Recommended for personal use</p>
            <p style={styles.cardItem}>Login happens automatically in the browser</p>
          </a>
          <a href="#bearer" className="install-card" style={styles.card}>
            <div style={styles.cardTitle}>Bearer Token</div>
            <p style={styles.cardItem}>Paste a static token into your config</p>
            <p style={styles.cardItem}>Recommended for automation or shared setups</p>
            <p style={styles.cardItem}>Token is generated once in the dashboard</p>
          </a>
        </div>
      </section>

      <hr style={styles.hr} />

      {/* Section A — OAuth 2.0 */}
      <section id="oauth" style={styles.section}>
        <h2 style={styles.heading2}>A — OAuth 2.0</h2>
        <p style={styles.intro}>
          The MCP server handles Google login automatically when Claude connects.
          No token to copy or manage — just add the server URL and Claude will open a browser login window on first connect.
        </p>

        <h3 style={styles.heading3}>Claude Desktop</h3>
        <p style={styles.intro}>
          Add the MCP server URL to your <code>claude_desktop_config.json</code>:
        </p>
        <div style={styles.codeBlock}>{desktopOAuthSnippet}</div>
        <p style={styles.note}>
          Claude will open a browser login window the first time it connects.
        </p>

        <h3 style={styles.heading3}>Claude Code</h3>
        <p style={styles.intro}>Add via CLI:</p>
        <div style={styles.codeBlock}>{codeOAuthSnippet}</div>
        <p style={styles.note}>
          Claude Code will prompt for Google login on first use.
        </p>
      </section>

      <hr style={styles.hr} />

      {/* Section B — Bearer Token */}
      <section id="bearer" style={styles.section}>
        <h2 style={styles.heading2}>B — Bearer Token</h2>
        <p style={styles.intro}>
          Use this method if you prefer a static token, or if you&apos;re configuring MCP for a shared or automated setup.
        </p>

        <p style={{ ...styles.intro, marginBottom: '0.5rem' }}>
          <strong>Step 1 — Generate a token:</strong> Log in to the dashboard and generate a Bearer Token under the &ldquo;Bearer Tokens&rdquo; section.
        </p>
        <a href="/dashboard" style={styles.ctaLink}>Go to Dashboard →</a>

        <h3 style={styles.heading3}>Claude Desktop</h3>
        <p style={styles.intro}>
          Add the MCP server URL and your token to <code>claude_desktop_config.json</code>:
        </p>
        <div style={styles.codeBlock}>{desktopBearerSnippet}</div>
        <p style={styles.note}>
          Replace <code>&lt;your-token&gt;</code> with the token copied from the dashboard. The token is only shown once.
        </p>

        <h3 style={styles.heading3}>Claude Code</h3>
        <p style={styles.intro}>Add via CLI:</p>
        <div style={styles.codeBlock}>{codeBearerSnippet}</div>
      </section>

      <hr style={styles.hr} />

      {/* Footer */}
      <footer style={styles.footer}>
        <div>
          <a href="/dashboard" style={styles.footerLink}>← Back to Dashboard</a>
        </div>
        <div>
          Need help? Contact support or visit the{' '}
          <a
            href="https://github.com/markminnoye/bpost-e-masspost-skills"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            Skills Documentation
          </a>
          .
        </div>
      </footer>
    </main>
  )
}

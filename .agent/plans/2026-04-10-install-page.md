# Install Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public `/install` page that guides users through connecting Claude Desktop or Claude Code to the BPost MCP service via OAuth 2.0 or Bearer Token.

**Architecture:** Three isolated file changes — a new static server component at `src/app/install/page.tsx`, plus two one-line additions (homepage button and dashboard link). No auth, no DB, no server actions. All inline styles following existing codebase conventions. MCP URL sourced from `NEXT_PUBLIC_BASE_URL` env var (already used in dashboard).

**Tech Stack:** Next.js 14 App Router, TypeScript, inline styles (codebase convention). No testing beyond lint/type-check — the page is purely static markup with no logic to unit-test; visual verification is the test strategy (consistent with dashboard `TokenRow` approach).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/install/page.tsx` | **Create** | Full install guide — sections, code snippets, navigation |
| `src/app/page.tsx` | **Modify** | Add "How to connect" button next to "Go to Dashboard" |
| `src/app/dashboard/page.tsx` | **Modify** | Add "How to connect →" link in the "Claude / MCP Clients" section |

---

## Task 1: Create the `/install` page

**File:** `src/app/install/page.tsx`

No tests — this is static markup. Lint + type-check are the verification gates.

> **Copy button:** The spec mentions "Code blocks: … with a small 'Copy' button" but explicitly lists "No copy-to-clipboard JavaScript" under Out of Scope. A non-functional button would be confusing UX, so the Copy button is deferred to v2 in its entirety.

### Step 1.1 — Create the page
- [ ] Create `src/app/install/page.tsx`:

```tsx
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://bpost-mcp.vercel.app'
const MCP_URL = `${BASE_URL}/api/mcp`

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
  jumpNav: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '2.5rem',
    fontSize: '0.95rem',
  } as const,
  jumpLink: {
    color: '#e30613',
    textDecoration: 'none',
    fontWeight: '600',
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
    flexDirection: 'column' as const,
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

  const codeOAuthSnippet = `claude mcp add bpost --url ${MCP_URL}`
  const codeBearerSnippet = `claude mcp add bpost --url ${MCP_URL} --header "Authorization: Bearer <your-token>"`

  return (
    <main style={styles.page}>
      {/* Header */}
      <h1 style={styles.heading1}>Connect to BPost MCP</h1>
      <p style={styles.subtitle}>
        Follow the steps below to connect Claude Desktop or Claude Code to your BPost account.
      </p>

      {/* Jump-to navigation */}
      <nav style={styles.jumpNav}>
        <a href="#oauth" style={styles.jumpLink}>→ OAuth 2.0 (recommended)</a>
        <a href="#bearer" style={styles.jumpLink}>→ Bearer Token</a>
      </nav>

      {/* Which method? */}
      <section style={styles.section}>
        <h2 style={{ ...styles.heading2, color: '#171717', fontSize: '1.1rem' }}>
          Which method is right for you?
        </h2>
        <div style={styles.cardsRow}>
          <div style={{ ...styles.card, borderColor: '#e30613' }}>
            <div style={styles.cardTitle}>OAuth 2.0</div>
            <p style={styles.cardItem}>Sign in with Google — no token to manage</p>
            <p style={styles.cardItem}>Recommended for personal use</p>
            <p style={styles.cardItem}>Login happens automatically in the browser</p>
          </div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Bearer Token</div>
            <p style={styles.cardItem}>Paste a static token into your config</p>
            <p style={styles.cardItem}>Recommended for automation or shared setups</p>
            <p style={styles.cardItem}>Token is generated once in the dashboard</p>
          </div>
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
```

### Step 1.2 — Lint and type-check
- [ ] Run: `npm run lint && npx tsc --noEmit`
- Expected: no errors

---

## Task 2: Add "How to connect" button on homepage

**File:** `src/app/page.tsx`

### Step 2.1 — Add the button
- [ ] In `src/app/page.tsx`, add a new `<a>` as the **second** element inside the existing `<div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>` block — after the "Go to Dashboard" anchor and before the "Skills Documentation" anchor:

```tsx
<a
  href="/install"
  style={{
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f4f4f4',
    color: '#171717',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'background-color 0.2s'
  }}
>
  How to connect
</a>
```

### Step 2.2 — Lint and type-check
- [ ] Run: `npm run lint && npx tsc --noEmit`
- Expected: no errors

---

## Task 3: Add "How to connect →" link in dashboard

**File:** `src/app/dashboard/page.tsx`

The "Claude / MCP Clients" section currently ends with a `<p style={{ color: '#888', fontSize: '0.8rem' }}>` tag. Add the link inside the section, immediately after that `</p>` and before the closing `</section>` tag.

> **Color note:** The dashboard uses `#ff0000` (pure red) throughout its dark theme — this is intentional and distinct from the `#e30613` brand red used on the light install page.

### Step 3.1 — Add the link
- [ ] In `src/app/dashboard/page.tsx`, in the `<section>` block for "Claude / MCP Clients", add the following immediately after `</p>` and before `</section>`:

```tsx
<a
  href="/install"
  style={{
    display: 'inline-block',
    marginTop: '0.75rem',
    fontSize: '0.85rem',
    color: '#ff0000',
    textDecoration: 'none',
    fontWeight: '600',
  }}
>
  How to connect →
</a>
```

### Step 3.2 — Lint and type-check
- [ ] Run: `npm run lint && npx tsc --noEmit`
- Expected: no errors

---

## Task 4: Final verification and commit

### Step 4.1 — Run full test suite
- [ ] Run: `npx vitest run`
- Expected: all tests pass (no regressions — we only added markup)

### Step 4.2 — Manual browser verification
- [ ] Run: `npm run dev`
- [ ] Open `http://localhost:3000` — verify "How to connect" button appears
- [ ] Click it — verify `/install` loads with light background and red headings
- [ ] Verify OAuth section (id="oauth") and Bearer section (id="bearer") both render correctly
- [ ] Verify jump-to links scroll to the correct sections
- [ ] Verify code snippets contain the correct MCP URL
- [ ] Verify "← Back to Dashboard" footer link works
- [ ] Open `http://localhost:3000/dashboard` — verify "How to connect →" link appears in the "Claude / MCP Clients" section

### Step 4.3 — Commit
- [ ] `git add src/app/install/page.tsx src/app/page.tsx src/app/dashboard/page.tsx`
- [ ] `git commit -m "feat(install): add /install page — OAuth and Bearer Token connection guide"`

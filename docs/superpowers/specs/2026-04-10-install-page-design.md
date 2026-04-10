# Design Spec: `/install` — MCP Installation Guide

**Date:** 2026-04-10
**Status:** Approved
**Route:** `/install`
**Auth required:** No — publicly accessible

---

## Overview

A public-facing installation guide page that helps users connect their Claude client (Claude Desktop or Claude Code) to the BPost MCP service. The page explains both available authentication methods and provides copy-ready configuration snippets.

---

## Goals

- Guide users to the correct auth method for their use case
- Provide copy-ready config snippets for each platform × method combination
- Be publicly accessible (no login required)
- Match a light, clean visual style (distinct from the dark dashboard)

---

## Navigation / Entry Points

| From | Element |
|---|---|
| Homepage (`/`) | New button: "How to connect" next to "Go to Dashboard" |
| Dashboard "Claude / MCP Clients" section | "How to connect →" link |

---

## Page Structure

### 1. Header
- Title: **"Connect to BPost MCP"**
- Subtitle: "Follow the steps below to connect Claude Desktop or Claude Code to your BPost account."

### 2. Jump-to Navigation
Two anchor links:
- `→ OAuth 2.0 (recommended)`
- `→ Bearer Token`

### 3. Which method is right for you?

Two side-by-side cards:

| OAuth 2.0 | Bearer Token |
|---|---|
| Sign in with Google — no token to manage | Paste a static token into your config |
| Recommended for personal use | Recommended for automation or shared setups |
| Login happens automatically in the browser | Token is generated once in the dashboard |

### 4. Section A — OAuth 2.0 (id: `oauth`)

**Intro:** Short paragraph explaining that the MCP server handles Google login automatically when Claude connects.

**Subsection: Claude Desktop**
- Explanation: Add the MCP server URL to `claude_desktop_config.json`
- Copy-ready JSON snippet:
```json
{
  "mcpServers": {
    "bpost": {
      "url": "https://bpost-mcp.vercel.app/api/mcp"
    }
  }
}
```
- Note: Claude will open a browser login window on first connect.

**Subsection: Claude Code**
- Explanation: Add via CLI command or config file
- Copy-ready CLI snippet:
```bash
claude mcp add bpost --url https://bpost-mcp.vercel.app/api/mcp
```
- Note: Claude Code will prompt for Google login on first use.

### 5. Section B — Bearer Token (id: `bearer`)

**Intro:** "Use this method if you prefer a static token, or if you're configuring MCP for a shared or automated setup."

**Step 1 — Generate a token:**
> First, log in to the dashboard and generate a Bearer Token under the "Bearer Tokens" section.
> [Go to Dashboard →] (link to `/dashboard`)

**Subsection: Claude Desktop**
- Copy-ready JSON snippet:
```json
{
  "mcpServers": {
    "bpost": {
      "url": "https://bpost-mcp.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer <your-token>"
      }
    }
  }
}
```
- Note: Replace `<your-token>` with the token copied from the dashboard. The token is only shown once.

**Subsection: Claude Code**
- Copy-ready CLI snippet:
```bash
claude mcp add bpost --url https://bpost-mcp.vercel.app/api/mcp --header "Authorization: Bearer <your-token>"
```

### 6. Footer
- Link: "← Back to Dashboard"
- Short note: "Need help? Contact support or visit the [Skills Documentation](https://github.com/markminnoye/bpost-e-masspost-skills)."

---

## Visual Style

- Light background (`#fafafa` or white)
- Red accent (`#e30613`) for headings and CTA buttons — consistent with homepage
- Clean sans-serif font (inherit from layout)
- Code blocks: light gray background (`#f4f4f4`), monospace, with a small "Copy" button
- Max content width: `760px`, centered

---

## Files to Create / Modify

| File | Action |
|---|---|
| `src/app/install/page.tsx` | Create — the install guide page |
| `src/app/page.tsx` | Modify — add "How to connect" button |
| `src/app/dashboard/page.tsx` | Modify — add "How to connect →" link in Claude/MCP section |

---

## Out of Scope

- No login/auth on this page
- No dynamic content (MCP URL is hardcoded via `NEXT_PUBLIC_BASE_URL`)
- No other platforms beyond Claude Desktop and Claude Code (can be extended later)
- No copy-to-clipboard JavaScript (static page, nice-to-have for v2)

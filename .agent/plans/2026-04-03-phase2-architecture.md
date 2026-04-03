# Phase 2 Architecture Plan — bpost-mcp

**Datum:** 2026-04-03
**Status:** Approved — ready for Sprint 1 implementation planning
**Author:** Architect Review (Claude Code)
**Scope:** Phase 2, Sprint 1 (Credential Layer + OAuth + Settings UI + Live Calls)

---

## 1. Context & Constraints

| Constraint | Value |
|---|---|
| Tenants | 1 pilot customer + internal (customer #0) |
| Call volume | ~10 BPost calls/day |
| Team | Solo developer |
| Platform | Single Vercel deployment (Next.js) |
| Timeline | Pilot — no hard deadline |
| GDPR | Personal address data flows through — don't persist it |
| Self-learning | Deferred to Phase 3 |

---

## 2. Architecture Decision Records

### ADR-001: Auth for Settings App — Google OAuth via Auth.js

**Problem:** Tenants need to log into a settings app to configure their BPost credentials. What auth method?

**Options considered:**

| Option | Pros | Cons |
|---|---|---|
| Sign in with Vercel | Zero setup | Requires Vercel account — not suitable for Belgian businesses |
| Descope / Clerk | Flexible, free tier | External SaaS vendor dependency |
| Google OAuth (Auth.js) | Free, universal, no SaaS vendor, Next.js-native | Google account required |
| Email + password | Universal | We maintain passwords — security burden |
| Magic link | No password | Requires SMTP/email service |

**Decision:** **Google OAuth via Auth.js v5**

**Rationale:**
- Pilot customers use Google Workspace — Google accounts are a given
- Auth.js is Next.js-native, runs on Vercel, free
- No external SaaS vendor beyond Google (which customers already depend on)
- Well-documented, minimal boilerplate

**Trade-offs accepted:**
- Google account required — acceptable for pilot, revisit for Phase 3

**Revisit trigger:** When onboarding customers without Google accounts

---

### ADR-002: MCP Endpoint Auth — Bearer Token (generated from settings app)

**Problem:** Claude Desktop / Langflow call the MCP endpoint machine-to-machine. OAuth browser flows don't work here.

**Decision:** After logging in via Google OAuth, the tenant generates a **bearer token** in the settings app. This token is entered as the Authorization header in Claude Desktop / Langflow MCP config.

**Flow:**
```
Tenant logs in (Google OAuth) → Settings app
→ Generates a bearer token (stored hashed in Postgres)
→ Copies token into Claude Desktop MCP config

Claude Desktop → POST /api/mcp
  Authorization: Bearer bpost_xxxxx
  → token hash lookup → tenant_id → BPost credentials → BPost
```

**Trade-offs accepted:**
- Claude Desktop's OAuth Client ID/Secret fields are not used in Sprint 1 — tenant manually copies the token
- Full OAuth authorization server (Claude Desktop OAuth flow) is deferred to Sprint 2

**Sprint 2 upgrade path:** Implement our server as an OAuth 2.0 Authorization Server. The `withMcpAuth` + `mcp-handler` integration from Vercel's docs supports this without rewriting the MCP logic. Sprint 1 bearer token becomes the fallback for non-OAuth clients.

---

### ADR-003: Credential Storage — Neon Postgres + Drizzle ORM

**Problem:** Where to store tenant BPost credentials securely?

**Decision:** **Neon Postgres** (Vercel Marketplace) with **Drizzle ORM**

**Rationale:**
- Single database for everything: sessions, tenants, credentials, tokens, audit log
- Neon is provisioned automatically via Vercel Marketplace (one env var: `DATABASE_URL`)
- Drizzle: TypeScript-first, no magic, readable queries — appropriate for someone new to Postgres
- Avoids a second storage service (no Upstash Redis needed)

**Rejected:** Upstash Redis — fast but loses relational integrity and audit trail; harder to extend

---

### ADR-004: Credential Encryption — AES-256-GCM

**Decision:** BPost passwords encrypted at rest with AES-256-GCM. Key stored in `ENCRYPTION_KEY` env var (set manually in Vercel dashboard).

**Why AES-256-GCM:** Authenticated encryption — protects against both confidentiality and tampering. IV stored per row (never reused).

---

### ADR-005: Deployment — Single Vercel Project

**Decision:** One Vercel project, two environments (Preview + Production).

**Rationale:** 1 pilot customer, solo dev. Vercel's built-in env var scoping per environment is sufficient. Separate projects add operational overhead with no benefit at this scale.

---

### ADR-006: GDPR Stance for Phase 2

**Decision:** Address data (personal information) is **not persisted** in our database. Only call metadata is logged: tool name, action type, status, error code, duration.

The address data flows: Agent → MCP server → BPost → response back. Nothing stored on our side.

**Revisit trigger:** Phase 3, when building the own address database (see vision.md §3)

---

### ADR-007: Self-Learning — Deferred to Phase 3

**Decision:** Declarative knowledge bank and procedural fix-scripts are out of scope for Phase 2.

**Rationale:** Adds complexity without delivering value for a 1-tenant pilot. The Postgres schema is designed to accommodate these tables later without migration pain.

---

## 3. Target Architecture

### 3.1 Request Flows

**Settings app (human flow):**
```
Tenant browser → /dashboard
  → not logged in → /api/auth/signin
  → Google OAuth (Auth.js) → callback
  → session established
  → /dashboard: configure BPost credentials + generate bearer token
```

**MCP endpoint (machine flow):**
```
Claude Desktop / Langflow
  Authorization: Bearer bpost_xxxxx
  → POST /api/mcp
  → middleware: hash token → lookup api_tokens table → tenant_id
  → resolve BPost credentials (decrypt)
  → createBpostClient(credentials)  ← blind agent: no credentials in tool schema
  → McpServer → tool handler → BPost HTTP
  → response back to agent
```

### 3.2 Folder Structure (changes only)

```
src/
├── app/
│   ├── api/
│   │   ├── mcp/route.ts           ← MODIFIED: add tenant resolution
│   │   └── auth/[...nextauth]/    ← NEW: Auth.js routes
│   ├── dashboard/                 ← NEW: settings UI
│   │   └── page.tsx               ← BPost credentials form + token management
│   └── .well-known/               ← NEW: OAuth metadata (Sprint 2)
├── lib/
│   ├── xml.ts                     ← UNCHANGED
│   ├── crypto.ts                  ← NEW: AES-256-GCM encrypt/decrypt
│   ├── db/
│   │   ├── client.ts              ← NEW: Drizzle + Neon singleton
│   │   └── schema.ts              ← NEW: all table definitions
│   └── tenant/
│       └── resolve.ts             ← NEW: bearer token → TenantContext
├── client/
│   ├── bpost.ts                   ← MODIFIED: accept credentials param
│   └── errors.ts                  ← UNCHANGED
└── schemas/                       ← ALL UNCHANGED
```

### 3.3 Database Schema

```typescript
// tenants
{ id: uuid PK, name: text, created_at: timestamp }

// bpost_credentials
{
  id: uuid PK,
  tenant_id: uuid FK,
  username: text,
  password_encrypted: text,   // AES-256-GCM ciphertext (base64)
  password_iv: text,          // GCM IV (base64)
  prs_number: text?,
  updated_at: timestamp
}

// api_tokens  (bearer tokens for MCP access)
{
  id: uuid PK,
  tenant_id: uuid FK,
  token_hash: text,           // SHA-256 of actual token — never store plain
  label: text,                // e.g. "claude-desktop-prod"
  created_at: timestamp,
  last_used_at: timestamp?,
  revoked_at: timestamp?
}

// auth_accounts  (Auth.js / Google OAuth sessions — managed by Auth.js adapter)
// handled by @auth/drizzle-adapter — no manual schema needed

// audit_log
{
  id: uuid PK,
  tenant_id: uuid FK,
  tool: text,                 // "bpost_announce_deposit" | "bpost_announce_mailing"
  action: text,               // "DepositCreate" etc.
  status: text,               // "ok" | "bpost_error" | "network_error"
  error_code: text?,
  duration_ms: integer,
  called_at: timestamp
  // NO address data stored
}
```

---

## 4. Environment Variables

| Variable | Source | Scope |
|---|---|---|
| `DATABASE_URL` | Neon Marketplace (auto) | Both |
| `ENCRYPTION_KEY` | Manual (Vercel dashboard) | Both (different keys!) |
| `AUTH_SECRET` | Manual | Both |
| `AUTH_GOOGLE_ID` | Manual (Google Cloud Console) | Both |
| `AUTH_GOOGLE_SECRET` | Manual (Google Cloud Console) | Both |
| `BPOST_USERNAME` | **Remove** after Phase 2 | — |
| `BPOST_PASSWORD` | **Remove** after Phase 2 | — |

---

## 5. Sprint 1 Implementation Sequence

> Write implementation plan before touching code.

1. Install dependencies: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `next-auth@beta`, `@auth/drizzle-adapter`
2. Provision Neon Postgres via Vercel Marketplace
3. Set up Google OAuth credentials in Google Cloud Console
4. `src/lib/db/schema.ts` — define all tables
5. `src/lib/db/client.ts` — Drizzle + Neon client singleton
6. `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt helpers
7. `src/lib/tenant/resolve.ts` — bearer token → TenantContext
8. Auth.js config + `/api/auth/[...nextauth]` route
9. `/dashboard` page — credentials form + token generator
10. Modify `src/client/bpost.ts` — accept credentials param (remove env fallback)
11. Modify `src/app/api/mcp/route.ts` — resolve tenant, inject credentials
12. `scripts/seed-demo-tenant.ts` — bootstrap internal tenant (customer #0)
13. Tests: token resolution, credential encryption round-trip, 401 on missing token, dashboard renders
14. Remove `BPOST_USERNAME` / `BPOST_PASSWORD` from env

---

## 6. Sprint 2 (Documented, Not Yet Planned)

**Full OAuth Authorization Server for Claude Desktop native flow:**
- Implement `/.well-known/oauth-authorization-server` discovery endpoint
- Use `mcp-handler` + `withMcpAuth` (migrate from `@modelcontextprotocol/sdk`)
- Claude Desktop uses OAuth Client ID + Secret instead of manual bearer token
- Requires migrating MCP route from current SDK to `mcp-handler` package

**Deferred items:**
- Self-learning (declarative rules, fix scripts) → Phase 3
- `run_fix_script` tool → Phase 3 (needs sandboxed execution)
- Non-Google login methods (email/magic link) → Phase 3

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google OAuth misconfigured (redirect URI) | Medium | Low | Test locally with `http://localhost:3000` first |
| Encryption key lost / rotated incorrectly | Low | High | Document rotation procedure before go-live |
| Neon cold start latency | Medium | Low | Use HTTP mode (`@neondatabase/serverless`) — no TCP handshake |
| Auth.js session vs bearer token confusion | Medium | Medium | Clear separation: session cookie for dashboard, bearer token for MCP only |
| `mcp-handler` migration (Sprint 2) breaks tools | Low | Medium | Sprint 1 stays on current SDK; migration is isolated to Sprint 2 |

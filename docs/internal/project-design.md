# BPost MCP Service: Initial Design & Brainstorming Log

## 1. Understanding Summary
- **What is being built:** An MCP service acting as a secure interface to an existing BPost service for announcing batch processes of sorting and delivering post packages (letters).
- **Why it is being built:** To allow an AI agent, via MCP, to programmatically interact with BPost batch APIs using structured data based on official API documentation and examples.
- **Who it is for:** AI agents utilizing the final service, and currently, the developer preparing a standardized environment for an agent to build the service.
- **Key constraints:** The architecture must enforce strict credential/secret management, support reliable error handling and logging for handling batch payloads, and safely segment sensitive data or documents.
- **Explicit non-goals:** We are not building a frontend UI. At this stage, we are establishing the environment and folder layout, leaving the actual implementation code for the future.

## 2. Key Assumptions
- Initial development will commence after reference PDFs and JSON/XML sample input/output files have been collected into `docs/`.
- The service will rely heavily on robust handling and validation of JSON/XML payloads representing letter batches.
- We require a clear separation between context/reference definitions (used to guide the AI) and the actual executable application source.

## 3. Decision Log
1. **Goal:** Building an MCP wrapper for a BPost batch service.
2. **Project Design:** `@docs/internal/project-design.md` for architectural decisions, constraints, and data flow.
3. **Vercel MCP Docs:** [Deploy MCP Servers to Vercel](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
4. **Vercel Next.js Template:** [MCP with Next.js](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
5. **Official MCP Examples:** [Claude AI MCP Servers](https://github.com/anthropics/claude-ai-mcp) — reference for tool definitions.
6. **External Specs:** Read PDF specs inside `docs/external/` to understand BPost constraints before writing validation.
10. **Integration Strategy:** **Langflow** is identified as a primary candidate for an orchestration endpoint. The MCP should be designed to be easily consumed by Langflow's tool-calling components (clear parameter descriptions, standard JSON outputs).

## 4. Final Folder Structure (Vercel/TypeScript)
```text
/bpost-mcp
├── docs/                      # Agent Context Brain 
│   ├── external/              # Raw BPost PDFs & Developer Guides 
│   ├── internal/              # Code-related documentation (like this file)
│   └── samples/               # Mock payloads (JSON/XML) used for tests & examples
├── src/                       # Vercel Application Source Code
│   ├── app/                   # Next.js / Vercel API routes (e.g., /api/mcp)
│   ├── client/                # HTTP fetch wrappers for communicating securely with BPost
│   └── schemas/               # Zod definitions ensuring valid letter batches
├── tests/                     # Unit & Integration tests for batch announcement
├── .env.local                 # Secret API keys and endpoints for BPost
├── AGENTS.md                  # Compact instructions and routing for AI Agents
└── package.json               # Node dependency map
```

## 5. Data Flow & Error Handling Strategy
1. **Invocation:** An agent calls the MCP tool (e.g., `announce_mail_batch`) with a JSON payload constructed from provided samples.
2. **Validation (`src/schemas`):** Validated against a strict schema (e.g., Zod) to prevent malformed requests reaching BPost. Returns exact field-level errors to the agent on failure so it can auto-correct.
3. **Execution (`src/client`):** Authenticates and dispatches payload to BPost API.
4. **Response:** Catch BPost-specific errors (400/500s) gracefully, parse the specific error message, and return it cleanly to the invoking agent rather than crashing the MCP server.

## Decision: XML Parsing Library

**Library:** `fast-xml-parser` v5 (installed: ^5.5.9)
**Reason:** Pure TypeScript, no native deps, supports attribute parsing (`ignoreAttributes: false`),
handles ISO-8859-1 encoding used by BPost XSDs, and produces predictable JS objects.
**Used in:** `src/lib/xml.ts` (singleton builder + parser configured for BPost format)
 
## 6. Credential Security & Multi-tenancy (Phase 2)

### Architecture
- **Bearer Token Auth:** Every MCP request must include an `Authorization: Bearer <token>` header.
- **Tenant Isolation:** Tokens are hashed (SHA-256) and matched in the `api_tokens` table. This resolves to a `tenant_id`, which is then used to retrieve BPost credentials for that specific customer.
- **Credential Encryption (ADR-004):** BPost passwords are never stored in plaintext. They are encrypted using **AES-256-GCM** with a unique IV (Initialization Vector) per record. The `ENCRYPTION_KEY` is stored in the environment variables.

### Database Schema
- **`tenants`**: Customer accounts.
- **`bpost_credentials`**: Encrypted BPost login, PRS-ID (`customer_number`), and PBC-ID (`account_id`).
- **`api_tokens`**: Revokable bearer tokens linked to tenants.
- **`audit_log`**: Track every MCP tool invocation, duration, and success/failure status for billing/transparency.

### Environment Management (`.env.local`)
- **`BPOST_DB_DATABASE_URL`**: Neon Postgres connection string.
- **`ENCRYPTION_KEY`**: 32-byte base64 secret for GCM.
- **`AUTH_SECRET`**: Random secret for Auth.js dashboard sessions.
- **`AUTH_GOOGLE_ID/SECRET`**: Google OAuth client for the settings dashboard.
- **`SEED_BPOST_...`**: Variables used to bootstrap the internal demo tenant account.

## 7. Bulk Processing & Semantic Triage (Phase 2 Sprint 2)

### The Desktop-First Handoff Architecture
Because MCP tools are purely JSON-based and suffer from heavy context-window bloat when passing large binary blobs (like 5000-row Excel files), the BPost MCP platform employs a hybrid **Out-Of-Band Upload** strategy designed specifically for Desktop AI Agents.

#### The 4-Phase Pipeline:
1. **Upload (Out-of-Band):** The local agent makes a standard `curl -X POST` to the `/api/batches/upload` endpoint, bypassing the LLM text limits. The Vercel server securely ingests the `.csv`/`.xlsx` file and places the raw parsed JSON in **Vercel KV**, tagging it `UNMAPPED`.
2. **Semantic Header Mapper:** The MCP tool `get_raw_headers` is used by the agent to view the raw array fields. The agent semantically generates a mapping (e.g. `Client Loc 1 -> postalCode`) and executes `apply_mapping_rules`. Vercel runs the heavy Zod validation and marks the KV batch as `MAPPED`.
3. **Triaging:** The agent loops over `get_batch_errors`, retrieving strict Zod errors row by row. It engages the human user to figure out fuzzy logic (e.g., truncating addresses, extracting floor numbers from strings) and uses `apply_row_fix` to repair rows instantly on KV.
4. **Submission:** Finally, `submit_ready_batch` packages all non-errored KV rows into official BPost XML and submits them.

### Infrastructure Additions
- **Vercel KV (Redis):** Provides transient, high-speed storage for batch JSON payloads with automatic 24-hour TTL constraints, ensuring raw client PII does not linger indefinitely in relational storage.

### Known Limitations

#### Batch Row Limit (MVP: 1,000 rows)
The entire `BatchState` — including both `raw` and `mapped` fields for every row — is serialized into a **single Redis key**. Upstash enforces a hard 1 MB per-key value limit on the free tier and 10–100 MB on paid tiers. At an average of ~800 bytes/row (raw + mapped JSON), a 10,000-row batch would exceed 8 MB and cause silent failures in `saveBatchState`.

**Current constraint:** The `/api/batches/upload` endpoint rejects files with more than **1,000 rows** (HTTP 413).

**Resolution path:** Split `rows` across multiple keys (`batch:{tenantId}:{batchId}:rows:{chunk}`), updating `getBatchState`/`saveBatchState` to reassemble them transparently. Tracked in: [markminnoye/bpost-mcp#4](https://github.com/markminnoye/bpost-mcp/issues/4).
